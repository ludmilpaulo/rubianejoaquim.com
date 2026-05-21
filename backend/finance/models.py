from django.db import models
from django.db.models import Sum
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal, InvalidOperation

User = get_user_model()


class Category(models.Model):
    """Categoria para despesas pessoais e de negócios"""
    name = models.CharField(max_length=100, help_text="Nome da categoria")
    icon = models.CharField(max_length=50, default="tag", help_text="Ícone da categoria")
    color = models.CharField(max_length=7, default="#6366f1", help_text="Cor em hexadecimal")
    is_personal = models.BooleanField(default=True, help_text="Usado para finanças pessoais")
    is_business = models.BooleanField(default=False, help_text="Usado para finanças de negócios")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categorias"
        ordering = ['name']

    def __str__(self):
        return self.name


# ==================== PERSONAL FINANCE ====================

class PersonalIncome(models.Model):
    """Receita / entrada de dinheiro pessoal"""
    SOURCE_CHOICES = [
        ('salary', 'Salário'),
        ('freelance', 'Freelance'),
        ('business', 'Negócio'),
        ('investment', 'Investimento'),
        ('gift', 'Presente'),
        ('other', 'Outro'),
    ]
    RECURRENCE_CHOICES = [
        ('none', 'Única'),
        ('weekly', 'Semanal'),
        ('monthly', 'Mensal'),
        ('yearly', 'Anual'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='personal_incomes')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='personal_incomes')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField()
    date = models.DateField()
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='salary')
    currency = models.CharField(max_length=3, default='AOA')
    is_recurring = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='none')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self) -> str:
        return f'{self.user_id} +{self.amount} {self.currency}'


class PersonalExpense(models.Model):
    """Despesa pessoal"""
    RECURRENCE_CHOICES = PersonalIncome.RECURRENCE_CHOICES

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='personal_expenses')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='personal_expenses')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(help_text="Descrição da despesa")
    date = models.DateField(help_text="Data da despesa")
    currency = models.CharField(max_length=3, default='AOA')
    is_recurring = models.BooleanField(default=False)
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default='none')
    notes = models.TextField(blank=True)
    receipt_url = models.CharField(max_length=500, blank=True)
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Dinheiro'),
            ('card', 'Cartão'),
            ('transfer', 'Transferência'),
            ('other', 'Outro'),
        ],
        default='cash'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Despesa Pessoal"
        verbose_name_plural = "Despesas Pessoais"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.amount} {self.currency} - {self.date}"


class ExchangeRate(models.Model):
    """Cached FX rates (base → target)."""
    base_currency = models.CharField(max_length=3, default='USD')
    target_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=18, decimal_places=8)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['base_currency', 'target_currency']
        ordering = ['target_currency']

    def __str__(self) -> str:
        return f'{self.base_currency}/{self.target_currency}={self.rate}'


class UserFavoriteCurrency(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorite_currencies')
    currency_code = models.CharField(max_length=3)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ['user', 'currency_code']
        ordering = ['order']


class Budget(models.Model):
    """Orçamento (diário, mensal, anual ou personalizado)"""
    PERIOD_CHOICES = [
        ('daily', 'Diário'),
        ('monthly', 'Mensal'),
        ('yearly', 'Anual'),
        ('custom', 'Personalizado'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='budgets')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    period_type = models.CharField(max_length=20, choices=PERIOD_CHOICES, default='monthly')
    # For daily budgets
    date = models.DateField(null=True, blank=True, help_text="Data (para orçamentos diários)")
    # For custom budgets
    start_date = models.DateField(null=True, blank=True, help_text="Data inicial (para orçamentos personalizados)")
    end_date = models.DateField(null=True, blank=True, help_text="Data final (para orçamentos personalizados)")
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    year = models.IntegerField()
    description = models.TextField(blank=True, help_text="Descrição do orçamento")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Orçamento"
        verbose_name_plural = "Orçamentos"
        # Keep the previous monthly uniqueness (best-effort); other period types may allow multiple entries.
        unique_together = ['user', 'category', 'month', 'year']
        ordering = ['-year', '-month', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.category.name if self.category else 'Geral'} - {self.month}/{self.year}"

    @property
    def spent(self):
        """Calcula quanto foi gasto dentro do período do orçamento"""
        try:
            expenses = PersonalExpense.objects.filter(user=self.user)
            
            # Filter by category if specified
            if self.category_id:
                expenses = expenses.filter(category=self.category)
            else:
                # If no category, only count expenses without category
                expenses = expenses.filter(category__isnull=True)

            # Filter by period type
            period_type = getattr(self, 'period_type', 'monthly')  # Default to monthly for backward compatibility
            
            if period_type == 'daily':
                if not self.date:
                    return Decimal('0.00')
                expenses = expenses.filter(date=self.date)
            elif period_type == 'yearly':
                expenses = expenses.filter(date__year=self.year)
            elif period_type == 'custom':
                if not self.start_date or not self.end_date:
                    return Decimal('0.00')
                expenses = expenses.filter(date__range=(self.start_date, self.end_date))
            else:  # monthly (default)
                expenses = expenses.filter(date__year=self.year, date__month=self.month)

            result = expenses.aggregate(Sum('amount'))['amount__sum']
            if result is None:
                return Decimal('0.00')
            # Ensure result is a properly quantized Decimal
            return Decimal(str(result)).quantize(Decimal('0.01'))
        except Exception as e:
            # Return 0 if there's any error calculating spent
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error calculating spent for budget {self.id}: {str(e)}')
            return Decimal('0.00')

    @property
    def remaining(self):
        """Calcula quanto resta do orçamento"""
        try:
            result = self.amount - self.spent
            # Ensure we return a properly quantized Decimal
            if isinstance(result, Decimal):
                return result.quantize(Decimal('0.01'))
            return Decimal(str(result)).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            return Decimal('0.00')

    @property
    def percentage_used(self):
        """Percentual usado do orçamento"""
        if self.amount == 0 or self.amount is None:
            return Decimal('0.00')
        try:
            # Ensure both values are Decimal
            spent_decimal = self.spent if isinstance(self.spent, Decimal) else Decimal(str(self.spent))
            amount_decimal = self.amount if isinstance(self.amount, Decimal) else Decimal(str(self.amount))
            
            if amount_decimal == 0:
                return Decimal('0.00')
            
            # Calculate percentage
            percentage = (spent_decimal / amount_decimal) * Decimal('100')
            # Quantize to 2 decimal places
            return percentage.quantize(Decimal('0.01'))
        except (InvalidOperation, ZeroDivisionError, TypeError, ValueError):
            return Decimal('0.00')


class Goal(models.Model):
    """Objetivo financeiro"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=200, help_text="Título do objetivo")
    description = models.TextField(blank=True, help_text="Descrição detalhada")
    target_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    current_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))])
    target_date = models.DateField(help_text="Data alvo para alcançar o objetivo")
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Ativo'),
            ('completed', 'Concluído'),
            ('cancelled', 'Cancelado'),
        ],
        default='active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Objetivo"
        verbose_name_plural = "Objetivos"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    @property
    def progress_percentage(self):
        """Percentual de progresso"""
        if self.target_amount == 0:
            return 0
        return min((self.current_amount / self.target_amount) * 100, 100)

    @property
    def remaining_amount(self):
        """Valor restante para alcançar o objetivo"""
        return max(self.target_amount - self.current_amount, 0)


class GoalContribution(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_contributions')
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='contributions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Debt(models.Model):
    """Dívida"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='debts')
    creditor = models.CharField(max_length=200, help_text="Nome do credor")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))])
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Taxa de juros (%)")
    due_date = models.DateField(help_text="Data de vencimento")
    description = models.TextField(blank=True, help_text="Descrição da dívida")
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Ativa'),
            ('paid', 'Paga'),
            ('overdue', 'Vencida'),
        ],
        default='active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dívida"
        verbose_name_plural = "Dívidas"
        ordering = ['due_date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.creditor} - {self.total_amount} AOA"

    @property
    def remaining_amount(self):
        """Valor restante a pagar"""
        return max(self.total_amount - self.paid_amount, 0)

    @property
    def progress_percentage(self):
        """Percentual pago"""
        if self.total_amount == 0:
            return 0
        return (self.paid_amount / self.total_amount) * 100


class DebtPayment(models.Model):
    debt = models.ForeignKey(Debt, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']


# ==================== BUSINESS FINANCE ====================

class Sale(models.Model):
    """Venda do negócio"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sales')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(help_text="Descrição da venda")
    customer_name = models.CharField(max_length=200, blank=True, help_text="Nome do cliente")
    date = models.DateField(help_text="Data da venda")
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Dinheiro'),
            ('card', 'Cartão'),
            ('transfer', 'Transferência'),
            ('check', 'Cheque'),
            ('other', 'Outro'),
        ],
        default='cash'
    )
    invoice_number = models.CharField(max_length=100, blank=True, help_text="Número da fatura")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Venda"
        verbose_name_plural = "Vendas"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.amount} AOA - {self.date}"


class FinancialHealthSnapshot(models.Model):
    """Monthly health score history for trends."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_snapshots')
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    score = models.DecimalField(max_digits=5, decimal_places=1)
    grade = models.CharField(max_length=32)
    components = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'month', 'year']
        ordering = ['-year', '-month']


class Receipt(models.Model):
    """Scanned receipt / invoice for expenses."""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('processed', 'Processado'),
        ('failed', 'Falhou'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='receipts')
    file = models.FileField(upload_to='receipts/%Y/%m/')
    merchant = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='AOA')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    scanned_text = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    linked_expense = models.ForeignKey(
        'PersonalExpense', on_delete=models.SET_NULL, null=True, blank=True, related_name='receipts'
    )
    is_business = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class BusinessExpense(models.Model):
    """Despesa do negócio"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_expenses')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='business_expenses')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(help_text="Descrição da despesa")
    date = models.DateField(help_text="Data da despesa")
    payment_method = models.CharField(
        max_length=50,
        choices=[
            ('cash', 'Dinheiro'),
            ('card', 'Cartão'),
            ('transfer', 'Transferência'),
            ('check', 'Cheque'),
            ('other', 'Outro'),
        ],
        default='cash'
    )
    supplier = models.CharField(max_length=200, blank=True, help_text="Nome do fornecedor")
    invoice_number = models.CharField(max_length=100, blank=True, help_text="Número da fatura")
    is_tax_deductible = models.BooleanField(default=False, help_text="Dedutível de impostos")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Despesa do Negócio"
        verbose_name_plural = "Despesas do Negócio"
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.amount} AOA - {self.date}"
