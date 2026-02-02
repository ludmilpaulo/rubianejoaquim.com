"""
Comando para inserir dados de teste para o utilizador Maitland@2025
Cria categorias, orçamentos, despesas, metas e tarefas
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random

from finance.models import Category, PersonalExpense, Budget, Goal, Debt
from tasks.models import Task, Target

User = get_user_model()


class Command(BaseCommand):
    help = 'Insere dados de teste para Maitland@2025 (categorias, orçamentos, despesas, metas, tarefas)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Inserindo dados de teste para Maitland@2025...'))

        # Get or create user
        try:
            user = User.objects.get(email='Maitland@2025')
            self.stdout.write(self.style.SUCCESS(f'✓ Utilizador encontrado: {user.email}'))
        except User.DoesNotExist:
            user = User.objects.create_user(
                username='maitland2025',
                email='Maitland@2025',
                password='Maitland@2025',
                first_name='Maitland',
                last_name='Test'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Utilizador criado: {user.email}'))

        # Create categories
        categories_data = [
            {'name': 'Alimentação', 'icon': 'food', 'color': '#ef4444', 'is_personal': True},
            {'name': 'Transporte', 'icon': 'car', 'color': '#3b82f6', 'is_personal': True},
            {'name': 'Saúde', 'icon': 'medical-bag', 'color': '#10b981', 'is_personal': True},
            {'name': 'Educação', 'icon': 'school', 'color': '#8b5cf6', 'is_personal': True},
            {'name': 'Lazer', 'icon': 'movie', 'color': '#f59e0b', 'is_personal': True},
            {'name': 'Casa', 'icon': 'home', 'color': '#ec4899', 'is_personal': True},
            {'name': 'Roupas', 'icon': 'tshirt-crew', 'color': '#6366f1', 'is_personal': True},
            {'name': 'Outros', 'icon': 'tag', 'color': '#6b7280', 'is_personal': True},
        ]

        categories = {}
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            categories[cat_data['name']] = category
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Categoria criada: {category.name}'))

        # Get current date info
        now = timezone.now().date()
        current_month = now.month
        current_year = now.year

        # Create budgets for different periods
        budgets = []

        # Monthly budgets for current month
        monthly_budgets_data = [
            {'category': 'Alimentação', 'amount': 50000, 'period_type': 'monthly'},
            {'category': 'Transporte', 'amount': 25000, 'period_type': 'monthly'},
            {'category': 'Saúde', 'amount': 30000, 'period_type': 'monthly'},
            {'category': 'Casa', 'amount': 40000, 'period_type': 'monthly'},
            {'category': 'Lazer', 'amount': 20000, 'period_type': 'monthly'},
        ]

        for budget_data in monthly_budgets_data:
            category = categories[budget_data['category']]
            budget, created = Budget.objects.get_or_create(
                user=user,
                category=category,
                month=current_month,
                year=current_year,
                period_type='monthly',
                defaults={
                    'amount': Decimal(str(budget_data['amount'])),
                    'description': f'Orçamento mensal para {category.name}'
                }
            )
            budgets.append(budget)
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Orçamento mensal criado: {category.name}'))

        # Daily budget for today (use "Outros" category to avoid unique constraint with monthly budgets)
        today_category = categories['Outros']
        # Check if daily budget already exists
        try:
            daily_budget = Budget.objects.get(
                user=user,
                category=today_category,
                date=now,
                period_type='daily'
            )
        except Budget.DoesNotExist:
            daily_budget = Budget.objects.create(
                user=user,
                category=today_category,
                date=now,
                period_type='daily',
                amount=Decimal('5000'),
                month=current_month,
                year=current_year,
                description='Orçamento diário para outras despesas'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Orçamento diário criado: {today_category.name}'))
        budgets.append(daily_budget)

        # Yearly budget
        yearly_category = categories['Educação']
        yearly_budget, created = Budget.objects.get_or_create(
            user=user,
            category=yearly_category,
            year=current_year,
            period_type='yearly',
            defaults={
                'amount': Decimal('200000'),
                'month': 1,
                'description': 'Orçamento anual para educação'
            }
        )
        budgets.append(yearly_budget)
        if created:
            self.stdout.write(self.style.SUCCESS(f'✓ Orçamento anual criado: {yearly_category.name}'))

        # Custom budget (next 30 days) - use different category
        custom_start = now
        custom_end = now + timedelta(days=30)
        custom_category = categories['Roupas']
        try:
            custom_budget = Budget.objects.get(
                user=user,
                category=custom_category,
                start_date=custom_start,
                end_date=custom_end,
                period_type='custom'
            )
        except Budget.DoesNotExist:
            custom_budget = Budget.objects.create(
                user=user,
                category=custom_category,
                start_date=custom_start,
                end_date=custom_end,
                period_type='custom',
                amount=Decimal('30000'),
                month=custom_start.month,
                year=custom_start.year,
                description='Orçamento personalizado para roupas (30 dias)'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Orçamento personalizado criado: {custom_category.name}'))
        budgets.append(custom_budget)

        # Create expenses for budgets
        expense_descriptions = [
            'Compra no supermercado',
            'Almoço no restaurante',
            'Jantar com amigos',
            'Taxi para o trabalho',
            'Combustível',
            'Consulta médica',
            'Medicamentos',
            'Conta de luz',
            'Conta de água',
            'Internet',
            'Cinema',
            'Livro',
            'Curso online',
            'Roupas novas',
            'Sapatos',
        ]

        payment_methods = ['cash', 'card', 'transfer', 'other']

        # Create expenses for monthly budgets
        for budget in budgets:
            if budget.period_type == 'monthly':
                # Create 5-10 expenses for each monthly budget
                num_expenses = random.randint(5, 10)
                for i in range(num_expenses):
                    # Random date within the month
                    expense_date = datetime(current_year, current_month, random.randint(1, min(28, now.day))).date()
                    
                    # Amount between 5% and 30% of budget
                    max_amount = float(budget.amount) * 0.30
                    min_amount = float(budget.amount) * 0.05
                    amount = Decimal(str(round(random.uniform(min_amount, max_amount), 2)))

                    expense = PersonalExpense.objects.create(
                        user=user,
                        category=budget.category,
                        amount=amount,
                        description=random.choice(expense_descriptions),
                        date=expense_date,
                        payment_method=random.choice(payment_methods)
                    )
                    if i == 0:
                        self.stdout.write(self.style.SUCCESS(f'  → Despesa criada para {budget.category.name}: {amount}'))

        # Create expenses for daily budget
        num_daily_expenses = random.randint(2, 4)
        for i in range(num_daily_expenses):
            amount = Decimal(str(round(random.uniform(500, 2000), 2)))
            expense = PersonalExpense.objects.create(
                user=user,
                category=daily_budget.category,
                amount=amount,
                description=random.choice(expense_descriptions),
                date=now,
                payment_method=random.choice(payment_methods)
            )
        self.stdout.write(self.style.SUCCESS(f'  → {num_daily_expenses} despesas criadas para orçamento diário'))

        # Create expenses for yearly budget
        for i in range(3):
            expense_date = datetime(current_year, random.randint(1, current_month), random.randint(1, 28)).date()
            amount = Decimal(str(round(random.uniform(5000, 20000), 2)))
            expense = PersonalExpense.objects.create(
                user=user,
                category=yearly_budget.category,
                amount=amount,
                description=random.choice(expense_descriptions),
                date=expense_date,
                payment_method=random.choice(payment_methods)
            )
        self.stdout.write(self.style.SUCCESS(f'  → 3 despesas criadas para orçamento anual'))

        # Create expenses for custom budget
        for i in range(2):
            expense_date = custom_start + timedelta(days=random.randint(0, min(15, (custom_end - custom_start).days)))
            amount = Decimal(str(round(random.uniform(2000, 5000), 2)))
            expense = PersonalExpense.objects.create(
                user=user,
                category=custom_budget.category,
                amount=amount,
                description=random.choice(expense_descriptions),
                date=expense_date,
                payment_method=random.choice(payment_methods)
            )
        self.stdout.write(self.style.SUCCESS(f'  → 2 despesas criadas para orçamento personalizado'))

        # Create goals
        goals_data = [
            {
                'title': 'Poupar para férias',
                'description': 'Poupar para uma viagem de férias no próximo ano',
                'target_amount': Decimal('500000'),
                'current_amount': Decimal('125000'),
                'target_date': datetime(current_year + 1, 6, 1).date(),
                'status': 'active'
            },
            {
                'title': 'Comprar carro novo',
                'description': 'Juntar dinheiro para entrada de um carro',
                'target_amount': Decimal('1000000'),
                'current_amount': Decimal('350000'),
                'target_date': datetime(current_year + 1, 12, 31).date(),
                'status': 'active'
            },
            {
                'title': 'Fundo de emergência',
                'description': 'Criar fundo de emergência equivalente a 6 meses de despesas',
                'target_amount': Decimal('600000'),
                'current_amount': Decimal('600000'),
                'target_date': datetime(current_year, 12, 31).date(),
                'status': 'completed'
            },
        ]

        for goal_data in goals_data:
            goal, created = Goal.objects.get_or_create(
                user=user,
                title=goal_data['title'],
                defaults=goal_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Meta criada: {goal.title}'))

        # Create debts
        debts_data = [
            {
                'creditor': 'Banco ABC',
                'total_amount': Decimal('250000'),
                'paid_amount': Decimal('75000'),
                'interest_rate': Decimal('15.5'),
                'due_date': datetime(current_year, current_month + 2, 15).date(),
                'description': 'Empréstimo pessoal',
                'status': 'active'
            },
            {
                'creditor': 'Cartão de Crédito',
                'total_amount': Decimal('50000'),
                'paid_amount': Decimal('20000'),
                'interest_rate': Decimal('18.0'),
                'due_date': datetime(current_year, current_month + 1, 5).date(),
                'description': 'Dívida do cartão de crédito',
                'status': 'active'
            },
        ]

        for debt_data in debts_data:
            debt, created = Debt.objects.get_or_create(
                user=user,
                creditor=debt_data['creditor'],
                defaults=debt_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Dívida criada: {debt.creditor}'))

        # Create tasks/targets
        targets_data = [
            {
                'title': 'Revisar orçamento mensal',
                'description': 'Revisar e ajustar o orçamento do mês',
                'target_date': datetime(current_year, current_month, 28).date(),
                'start_date': datetime(current_year, current_month, 1).date(),
                'status': 'pending'
            },
            {
                'title': 'Pagar conta de luz',
                'description': 'Pagar a conta de luz antes do vencimento',
                'target_date': datetime(current_year, current_month, 15).date(),
                'start_date': datetime(current_year, current_month, 1).date(),
                'status': 'completed'
            },
            {
                'title': 'Transferir para poupança',
                'description': 'Transferir 10% do salário para conta poupança',
                'target_date': datetime(current_year, current_month + 1, 5).date(),
                'start_date': datetime(current_year, current_month, 1).date(),
                'status': 'pending'
            },
        ]

        for target_data in targets_data:
            target, created = Target.objects.get_or_create(
                user=user,
                title=target_data['title'],
                defaults=target_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Tarefa/Meta criada: {target.title}'))

        # Summary
        total_budgets = Budget.objects.filter(user=user).count()
        total_expenses = PersonalExpense.objects.filter(user=user).count()
        total_goals = Goal.objects.filter(user=user).count()
        total_debts = Debt.objects.filter(user=user).count()
        total_targets = Target.objects.filter(user=user).count()

        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('RESUMO DOS DADOS CRIADOS:'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS(f'✓ Orçamentos: {total_budgets}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Despesas: {total_expenses}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Metas: {total_goals}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Dívidas: {total_debts}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Tarefas/Metas: {total_targets}'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(self.style.SUCCESS('\n✓ Dados de teste inseridos com sucesso!'))
        self.stdout.write(self.style.SUCCESS(f'Utilizador: {user.email}'))
        self.stdout.write(self.style.SUCCESS('Password: Maitland@2025'))
