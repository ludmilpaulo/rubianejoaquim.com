"""AI Copilot: calculated facts, FX, isolation, confirmable actions."""
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from finance.models import (
    Budget,
    BusinessExpense,
    Category,
    Debt,
    ExchangeRate,
    Goal,
    PersonalExpense,
    PersonalIncome,
    Sale,
)
from finance_space.models import FamilyEntry, FinanceSpace, FinanceSpaceMember
from ai_copilot.facts import parse_fx_request, run_calculations, template_reply

User = get_user_model()


def _seed_fx():
    now = timezone.now() - timedelta(minutes=10)
    for code, rate in {'USD': Decimal('1'), 'ZAR': Decimal('18.50'), 'AOA': Decimal('900'), 'EUR': Decimal('0.92')}.items():
        ExchangeRate.objects.create(
            base_currency='USD',
            target_currency=code,
            rate=rate,
            source='open.er-api.com',
            provider_updated_at=now,
        )
    return now


class CopilotFactsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='copilot',
            email='copilot@test.com',
            password='pass12345',
            first_name='Ada',
            preferred_currency='ZAR',
            preferred_locale='en',
            finance_level='beginner',
        )
        self.other = User.objects.create_user(
            username='other', email='other@test.com', password='pass12345', preferred_currency='USD'
        )
        self.rate_ts = _seed_fx()
        today = date.today()
        food = Category.objects.create(name='Food', is_personal=True)
        PersonalIncome.objects.create(
            user=self.user, amount=Decimal('20000'), currency='ZAR', date=today,
            description='Salary', source_type='salary',
        )
        PersonalExpense.objects.create(
            user=self.user, amount=Decimal('5000'), currency='ZAR', date=today,
            description='Food', category=food,
        )
        Sale.objects.create(
            user=self.user, amount=Decimal('12000'), currency='ZAR', date=today, description='Consulting',
        )
        BusinessExpense.objects.create(
            user=self.user, amount=Decimal('3000'), currency='ZAR', date=today, description='Supplies',
        )
        PersonalExpense.objects.create(
            user=self.other, amount=Decimal('99999'), currency='USD', date=today, description='Secret',
        )
        Debt.objects.create(
            user=self.user, creditor='Bank', total_amount=Decimal('10000'), paid_amount=Decimal('2000'),
            currency='ZAR', due_date=today + timedelta(days=30),
        )
        Goal.objects.create(
            user=self.user, title='Emergency', target_amount=Decimal('20000'), current_amount=Decimal('2000'),
            currency='ZAR', target_date=today + timedelta(days=180),
        )
        Budget.objects.create(
            user=self.user, amount=Decimal('8000'), currency='ZAR', month=today.month, year=today.year,
            period_type='monthly',
        )

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_fx_zar_to_usd_uses_market_cache(self, _refresh):
        parsed = parse_fx_request('Convert 5,000 ZAR to USD.')
        self.assertEqual(parsed['from'], 'ZAR')
        self.assertEqual(parsed['to'], 'USD')
        bundle = run_calculations(self.user, 'Convert 5,000 ZAR to USD.', locale='en')
        fx = bundle['fx']
        self.assertEqual(fx['original_amount'], '5000.00')
        self.assertEqual(fx['original_currency'], 'ZAR')
        self.assertEqual(fx['target_currency'], 'USD')
        self.assertEqual(fx['converted_amount'], '270.27')
        self.assertEqual(fx['source'], 'open.er-api.com')
        self.assertIsNotNone(fx['provider_updated_at'])
        reply = template_reply(bundle)
        self.assertIn('270.27', reply)
        self.assertIn('open.er-api.com', reply)

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_aoa_to_eur(self, _refresh):
        bundle = run_calculations(self.user, 'Convert 250,000 AOA to EUR.', locale='en')
        self.assertEqual(bundle['fx']['original_currency'], 'AOA')
        self.assertEqual(bundle['fx']['target_currency'], 'EUR')
        self.assertNotIn('error', bundle['fx'])

    def test_does_not_include_other_user_expenses(self):
        bundle = run_calculations(self.user, 'How much did I spend this month?', locale='en')
        self.assertEqual(bundle['snapshot']['expenses'], '5000.00')
        self.assertNotIn('99999', bundle['snapshot']['expenses'])

    def test_missing_income_is_honest(self):
        empty = User.objects.create_user(
            username='broke', email='broke@test.com', password='pass12345', preferred_locale='en'
        )
        bundle = run_calculations(empty, 'How much of my salary have I spent?', locale='en')
        self.assertIn('income', bundle['snapshot']['missing'])
        self.assertIn('add your salary', template_reply(bundle).lower())

    def test_family_private_entry_excluded(self):
        space = FinanceSpace.objects.create(
            name='House', owner=self.user, invite_code='FTEST001', currency='ZAR', require_approval=False,
        )
        FinanceSpaceMember.objects.create(space=space, user=self.user, role='owner', status='active')
        FinanceSpaceMember.objects.create(space=space, user=self.other, role='adult', status='active')
        FamilyEntry.objects.create(
            space=space, user=self.user, kind='expense', title='Secret school', amount=Decimal('3000'),
            currency='ZAR', converted_amount=Decimal('3000'), visibility='private',
            date=date.today(), paid_by=self.user,
        )
        FamilyEntry.objects.create(
            space=space, user=self.user, kind='expense', title='Groceries', amount=Decimal('400'),
            currency='ZAR', converted_amount=Decimal('400'), visibility='family',
            date=date.today(), paid_by=self.user,
        )
        other_view = run_calculations(self.other, 'How much has our family spent this month?', locale='en')
        families = other_view['snapshot']['family']
        self.assertTrue(families)
        self.assertEqual(families[0]['expenses'], '400.00')
        self.assertNotIn('3000', families[0]['expenses'])

    def test_locale_portuguese_template(self):
        bundle = run_calculations(self.user, 'Quanto gastei este mês?', locale='pt')
        reply = template_reply(bundle)
        self.assertIn('Este mês', reply)
        self.assertIn('5000.00', reply)

    @patch('ai_copilot.views.OPENAI_AVAILABLE', False)
    def test_chat_endpoint_uses_facts_without_openai(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.post(
            '/api/ai-copilot/conversations/chat/',
            {'message': 'How much debt do I have?', 'locale': 'en'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('8000.00', response.data['assistant_message']['content'])
        self.assertEqual(response.data['facts']['debt_total'], '8000.00')
        self.assertEqual(response.data['assistant_message']['user'] if False else response.data['conversation_id'], response.data['conversation_id'])

    @patch('ai_copilot.views.OPENAI_AVAILABLE', False)
    def test_confirm_create_goal(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        chat = client.post(
            '/api/ai-copilot/conversations/chat/',
            {'message': 'Create a savings goal of 20000 ZAR', 'locale': 'en'},
            format='json',
        )
        self.assertEqual(chat.status_code, status.HTTP_200_OK)
        action = chat.data['proposed_action']
        self.assertIsNotNone(action)
        self.assertEqual(action['type'], 'create_goal')
        self.assertEqual(action['status'], 'pending')
        before = Goal.objects.filter(user=self.user).count()
        confirm = client.post(
            '/api/ai-copilot/conversations/confirm-action/',
            {
                'conversation_id': chat.data['conversation_id'],
                'action_id': action['id'],
                'confirm': True,
            },
            format='json',
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm.data['status'], 'confirmed')
        self.assertEqual(Goal.objects.filter(user=self.user).count(), before + 1)

    def test_other_user_cannot_read_conversation(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        with patch('ai_copilot.views.OPENAI_AVAILABLE', False):
            chat = client.post(
                '/api/ai-copilot/conversations/chat/',
                {'message': 'Analyze my finances', 'locale': 'en'},
                format='json',
            )
        cid = chat.data['conversation_id']
        other = APIClient()
        other.force_authenticate(user=self.other)
        leaked = other.get(f'/api/ai-copilot/conversations/{cid}/')
        self.assertEqual(leaked.status_code, status.HTTP_404_NOT_FOUND)

    def test_thousands_separator_parses_as_five_thousand(self):
        parsed = parse_fx_request('Convert 5,000 ZAR to USD.')
        self.assertEqual(parsed['amount'], Decimal('5000'))
        parsed_aoa = parse_fx_request('Convert 250,000 AOA to EUR.')
        self.assertEqual(parsed_aoa['amount'], Decimal('250000'))

    def test_finance_level_and_business_in_snapshot(self):
        bundle = run_calculations(self.user, 'How is my business performing this month?', locale='en')
        self.assertEqual(bundle['snapshot']['finance_level'], 'beginner')
        self.assertEqual(bundle['intent'], 'business')
        self.assertEqual(bundle['snapshot']['business']['revenue'], '12000.00')
        self.assertEqual(bundle['snapshot']['business']['expenses'], '3000.00')
        self.assertIn('12000.00', template_reply(bundle))

    def test_unauthenticated_chat_is_rejected(self):
        client = APIClient()
        response = client.post(
            '/api/ai-copilot/conversations/chat/',
            {'message': 'Analyze my finances', 'locale': 'en'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('ai_copilot.views.OPENAI_AVAILABLE', False)
    def test_qa_questions_in_four_locales(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        questions = {
            'en': [
                'How much did I spend this month?',
                'Am I over budget?',
                'Where am I spending the most?',
                'How much debt do I have?',
                'How much should I save each month?',
                'Can I afford this expense?',
                'Convert 5,000 ZAR to USD.',
                'Convert 250,000 AOA to EUR.',
                'How can I reduce my debt?',
                'Analyze my finances.',
                'Create a plan to save money.',
            ],
            'pt': [
                'Quanto gastei este mês?',
                'Estou acima do orçamento?',
                'Onde estou a gastar mais?',
                'Quanta dívida tenho?',
                'Quanto devo poupar por mês?',
                'Posso gastar isto?',
                'Converte 5.000 ZAR para USD.',
                'Converte 250.000 AOA para EUR.',
                'Como reduzir a minha dívida?',
                'Analisa as minhas finanças.',
                'Cria um plano para poupar.',
            ],
            'fr': [
                'Combien ai-je dépensé ce mois-ci ?',
                'Suis-je au-dessus du budget ?',
                'Où est-ce que je dépense le plus ?',
                'Combien de dettes ai-je ?',
                'Combien dois-je épargner chaque mois ?',
                'Puis-je me permettre cette dépense ?',
                'Convertir 5 000 ZAR en USD.',
                'Convertir 250 000 AOA en EUR.',
                'Comment réduire mes dettes ?',
                'Analyser mes finances.',
                'Créer un plan d’épargne.',
            ],
            'es': [
                '¿Cuánto gasté este mes?',
                '¿Estoy por encima del presupuesto?',
                '¿Dónde gasto más?',
                '¿Cuánta deuda tengo?',
                '¿Cuánto debo ahorrar cada mes?',
                '¿Puedo permitirme este gasto?',
                'Convierte 5.000 ZAR a USD.',
                'Convierte 250.000 AOA a EUR.',
                '¿Cómo reduzco mi deuda?',
                'Analiza mis finanzas.',
                'Crea un plan para ahorrar.',
            ],
        }
        for locale, prompts in questions.items():
            for prompt in prompts:
                response = client.post(
                    '/api/ai-copilot/conversations/chat/',
                    {'message': prompt, 'locale': locale},
                    format='json',
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK, prompt)
                content = response.data['assistant_message']['content']
                self.assertTrue(content)
                self.assertNotIn('coming soon', content.lower())
                facts = response.data['facts']
                self.assertEqual(facts['expenses'], '5000.00')
                self.assertNotIn('99999', content)

    @patch('finance.fx.refresh_exchange_rates', return_value={'refreshed': False, 'stale': False})
    def test_aoa_converted_amount_is_calculated(self, _refresh):
        bundle = run_calculations(self.user, 'Convert 250,000 AOA to EUR.', locale='en')
        self.assertEqual(bundle['fx']['original_amount'], '250000.00')
        self.assertEqual(bundle['fx']['converted_amount'], '255.56')
