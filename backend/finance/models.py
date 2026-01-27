from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

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

class PersonalExpense(models.Model):
    """Despesa pessoal"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='personal_expenses')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='personal_expenses')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(help_text="Descrição da despesa")
    date = models.DateField(help_text="Data da despesa")
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
        return f"{self.user.username} - {self.amount} AOA - {self.date}"


class Budget(models.Model):
    """Orçamento mensal"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='budgets')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    year = models.IntegerField()
    description = models.TextField(blank=True, help_text="Descrição do orçamento")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Orçamento"
        verbose_name_plural = "Orçamentos"
        unique_together = ['user', 'category', 'month', 'year']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.user.username} - {self.category.name if self.category else 'Geral'} - {self.month}/{self.year}"

    @property
    def spent(self):
        """Calcula quanto foi gasto neste orçamento"""
        expenses = PersonalExpense.objects.filter(
            user=self.user,
            category=self.category,
            date__year=self.year,
            date__month=self.month
        )
        return sum(exp.amount for exp in expenses)

    @property
    def remaining(self):
        """Calcula quanto resta do orçamento"""
        return self.amount - self.spent

    @property
    def percentage_used(self):
        """Percentual usado do orçamento"""
        if self.amount == 0:
            return 0
        return (self.spent / self.amount) * 100


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
