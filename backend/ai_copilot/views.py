import logging

from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from subscriptions.models import MobileAppSubscription
from subscriptions.tiers import effective_tier, has_feature

from .actions import execute_action
from .facts import run_calculations, system_prompt, template_reply
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    ConversationListSerializer,
    MessageSerializer,
    ChatRequestSerializer,
    ConfirmActionSerializer,
)

logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class HasAICopilot(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        user = request.user
        if user.is_staff or user.is_superuser:
            return True
        try:
            sub = user.mobile_app_subscription
        except MobileAppSubscription.DoesNotExist:
            return True
        if not sub.has_access:
            return False
        return has_feature(effective_tier(sub), 'ai_copilot') or sub.has_access


def _public_facts(bundle: dict) -> dict:
    snap = bundle.get('snapshot') or {}
    return {
        'intent': bundle.get('intent'),
        'currency': snap.get('currency'),
        'income': snap.get('income'),
        'expenses': snap.get('expenses'),
        'balance': snap.get('balance'),
        'budget_remaining': snap.get('budget_remaining'),
        'debt_total': snap.get('debt_total'),
        'categories': (snap.get('categories') or [])[:5],
        'fx': bundle.get('fx'),
        'missing': snap.get('missing') or [],
        'health': snap.get('health'),
    }


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [HasAICopilot]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='chat')
    def chat(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data['message']
        conversation_id = serializer.validated_data.get('conversation_id')
        locale = serializer.validated_data.get('locale')

        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, user=request.user)
            except Conversation.DoesNotExist:
                return Response({'error': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation = Conversation.objects.create(
                user=request.user,
                title=user_message[:50],
            )

        user_msg = Message.objects.create(
            conversation=conversation,
            role='user',
            content=user_message,
        )

        bundle = run_calculations(request.user, user_message, locale=locale)
        facts_out = _public_facts(bundle)
        proposed = bundle.get('proposed_action')
        fallback = template_reply(bundle)

        try:
            ai_response = self._call_openai(conversation, bundle, fallback)
        except Exception:
            logger.exception('OpenAI call failed; using calculated template')
            ai_response = fallback

        assistant_msg = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response,
            facts=facts_out,
            proposed_action=proposed,
        )
        conversation.save(update_fields=['updated_at'])

        return Response({
            'conversation_id': conversation.id,
            'conversation_title': conversation.title,
            'user_message': MessageSerializer(user_msg).data,
            'assistant_message': MessageSerializer(assistant_msg).data,
            'facts': facts_out,
            'proposed_action': proposed,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='confirm-action')
    def confirm_action(self, request):
        serializer = ConfirmActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = Conversation.objects.filter(
            id=serializer.validated_data['conversation_id'],
            user=request.user,
        ).first()
        if not conversation:
            return Response({'error': 'Conversation not found.'}, status=status.HTTP_404_NOT_FOUND)
        action_id = serializer.validated_data['action_id']
        msg = (
            conversation.messages.filter(role='assistant', proposed_action__isnull=False)
            .order_by('-created_at')
            .first()
        )
        if not msg or not msg.proposed_action or msg.proposed_action.get('id') != action_id:
            return Response({'error': 'Action not found.'}, status=status.HTTP_404_NOT_FOUND)
        if msg.proposed_action.get('status') != 'pending':
            return Response({'error': 'Action already resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        locale = (serializer.validated_data.get('locale') or getattr(request.user, 'preferred_locale', None) or 'en').lower()[:2]
        done = {
            'en': 'Done. The change is saved in Zenda.',
            'pt': 'Feito. A alteração está gravada no Zenda.',
            'fr': 'C’est fait. La modification est enregistrée dans Zenda.',
            'es': 'Listo. El cambio está guardado en Zenda.',
        }.get(locale, 'Done. The change is saved in Zenda.')

        if not serializer.validated_data['confirm']:
            msg.proposed_action = {**msg.proposed_action, 'status': 'cancelled'}
            msg.save(update_fields=['proposed_action'])
            return Response({'status': 'cancelled', 'proposed_action': msg.proposed_action})

        try:
            result = execute_action(request.user, msg.proposed_action)
        except Exception:
            logger.exception('Copilot action failed')
            return Response({'error': 'Could not complete that action.'}, status=status.HTTP_400_BAD_REQUEST)

        msg.proposed_action = {**msg.proposed_action, 'status': 'confirmed', 'result': result}
        msg.save(update_fields=['proposed_action'])
        confirmation = Message.objects.create(
            conversation=conversation,
            role='assistant',
            content=done,
            proposed_action=msg.proposed_action,
        )
        return Response({
            'status': 'confirmed',
            'result': result,
            'assistant_message': MessageSerializer(confirmation).data,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='monthly-report')
    def monthly_report(self, request):
        from finance.services import build_dashboard, build_analytics

        dash = build_dashboard(request.user)
        analytics = build_analytics(request.user)
        h = dash['health']
        summary = dash['summary']
        lines = [
            f"Zenda monthly report — {h['month']}/{h['year']}",
            f"Financial health: {h['score']}/100 ({h['grade']})",
            f"Income: {summary['income']} | Expenses: {summary['expenses']} | Balance: {summary['balance']}",
        ]
        if h.get('tips'):
            lines.append('Priorities: ' + ', '.join(h['tips']))
        if analytics['debt_payoff']:
            lines.append(f"Active debts: {len(analytics['debt_payoff'])}.")
        if analytics['savings_projection']:
            lines.append(f"Savings goals: {len(analytics['savings_projection'])}.")
        return Response({'report': '\n'.join(lines), 'health': h, 'summary': summary, 'analytics': analytics})

    @action(detail=False, methods=['get'], url_path='savings-plan')
    def savings_plan(self, request):
        from finance.services import build_analytics

        data = build_analytics(request.user)
        plans = []
        for g in data['savings_projection']:
            plans.append({
                'goal': g['title'],
                'remaining': g['remaining'],
                'suggested_monthly': g['suggested_monthly'],
                'message': f"Save {g['suggested_monthly']} per month for ~{g['projected_completion_months']} months to reach «{g['title']}».",
            })
        if not plans:
            plans.append({'message': 'Add a savings goal in Personal finance to get a plan.'})
        return Response({'plans': plans})

    @action(detail=False, methods=['get'], url_path='debt-strategy')
    def debt_strategy(self, request):
        from finance.services import build_analytics

        data = build_analytics(request.user)
        strategies = []
        for d in data['debt_payoff']:
            strategies.append({
                'creditor': d['creditor'],
                'remaining': d['remaining'],
                'months_to_payoff': d['months_to_payoff'],
                'message': f"Paying about 10% of remaining each month, «{d['creditor']}» could clear in about {d['months_to_payoff']} months (illustrative, not a contractual instalment).",
            })
        if not strategies:
            strategies.append({'message': 'No active debts recorded.'})
        return Response({'strategies': strategies})

    @action(detail=False, methods=['get'], url_path='insights')
    def insights(self, request):
        from finance.services import build_dashboard

        locale = (request.query_params.get('locale') or getattr(request.user, 'preferred_locale', None) or 'en').lower()[:2]
        data = build_dashboard(request.user)
        health = data.get('health') or {}
        summary = data.get('summary') or {}
        tips = health.get('tips') or []
        prompts = {
            'en': [
                'Analyze my spending',
                'Check my budget',
                'Help me reduce debt',
                'How much can I save?',
                'Analyze my finances',
                'Convert my money',
                'Create a financial plan',
            ],
            'pt': [
                'Analisa os meus gastos',
                'Verifica o meu orçamento',
                'Ajuda-me a reduzir dívidas',
                'Quanto posso poupar?',
                'Analisa as minhas finanças',
                'Converte o meu dinheiro',
                'Cria um plano financeiro',
            ],
            'fr': [
                'Analyser mes dépenses',
                'Vérifier mon budget',
                'Réduire mes dettes',
                'Combien puis-je épargner ?',
                'Analyser mes finances',
                'Convertir mon argent',
                'Créer un plan financier',
            ],
            'es': [
                'Analiza mis gastos',
                'Revisa mi presupuesto',
                'Ayúdame a reducir deudas',
                '¿Cuánto puedo ahorrar?',
                'Analiza mis finanzas',
                'Convierte mi dinero',
                'Crea un plan financiero',
            ],
        }
        suggested = list(prompts.get(locale, prompts['en']))
        labels = {
            'en': ('Income', 'Expenses', 'Balance', 'Health'),
            'pt': ('Receitas', 'Despesas', 'Saldo', 'Saúde'),
            'fr': ('Revenus', 'Dépenses', 'Solde', 'Santé'),
            'es': ('Ingresos', 'Gastos', 'Saldo', 'Salud'),
        }
        inc, exp, bal, hth = labels.get(locale, labels['en'])
        report_lines = [
            f"{inc}: {summary.get('income', 0)} | {exp}: {summary.get('expenses', 0)} | {bal}: {summary.get('balance', 0)}",
            f"{hth}: {health.get('score', 0)}/100 ({health.get('grade', 'fair')})",
        ]
        return Response({
            'health_score': health.get('score', 0),
            'grade': health.get('grade', 'fair'),
            'tips': tips,
            'summary': summary,
            'monthly_report': ' '.join(report_lines),
            'suggested_prompts': suggested[:7],
            'goals_count': len(data.get('goals') or []),
            'debts_count': len(data.get('debts') or []),
        })

    def _call_openai(self, conversation, bundle: dict, fallback: str) -> str:
        api_key = getattr(settings, 'OPENAI_API_KEY', None)
        if not api_key or not OPENAI_AVAILABLE:
            return fallback

        history = list(conversation.messages.order_by('-created_at')[:12])
        history.reverse()
        messages = [{'role': 'system', 'content': system_prompt(bundle)}]
        for msg in history:
            if msg.role in ('user', 'assistant') and msg.content:
                messages.append({'role': msg.role, 'content': msg.content[:4000]})

        client = OpenAI(api_key=api_key, timeout=25.0)
        response = client.chat.completions.create(
            model=getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini'),
            messages=messages,
            max_tokens=900,
            temperature=0.3,
        )
        content = (response.choices[0].message.content or '').strip()
        if not content:
            return fallback
        return content
