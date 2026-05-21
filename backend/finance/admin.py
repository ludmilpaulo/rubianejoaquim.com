from django.contrib import admin
from .models import (
    Category, PersonalExpense, PersonalIncome, Budget, Goal, GoalContribution,
    Debt, DebtPayment,
    Sale, BusinessExpense, ExchangeRate, UserFavoriteCurrency,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'is_personal', 'is_business', 'created_at']
    list_filter = ['is_personal', 'is_business']
    search_fields = ['name']


@admin.register(PersonalIncome)
class PersonalIncomeAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'source_type', 'date', 'currency', 'is_recurring']
    list_filter = ['source_type', 'currency', 'is_recurring']
    search_fields = ['user__email', 'description']


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    list_display = ['base_currency', 'target_currency', 'rate', 'updated_at']


@admin.register(UserFavoriteCurrency)
class UserFavoriteCurrencyAdmin(admin.ModelAdmin):
    list_display = ['user', 'currency_code', 'order']


@admin.register(PersonalExpense)
class PersonalExpenseAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'amount', 'date', 'payment_method', 'created_at']
    list_filter = ['category', 'payment_method', 'date']
    search_fields = ['user__username', 'description']
    date_hierarchy = 'date'


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'amount', 'month', 'year', 'created_at']
    list_filter = ['month', 'year', 'category']
    search_fields = ['user__username', 'description']


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'target_amount', 'current_amount', 'target_date', 'status', 'created_at']
    list_filter = ['status', 'target_date']
    search_fields = ['user__username', 'title', 'description']


@admin.register(GoalContribution)
class GoalContributionAdmin(admin.ModelAdmin):
    list_display = ['user', 'goal', 'amount', 'created_at']
    search_fields = ['user__username', 'goal__title', 'note']


@admin.register(DebtPayment)
class DebtPaymentAdmin(admin.ModelAdmin):
    list_display = ['debt', 'amount', 'payment_date', 'created_at']
    search_fields = ['debt__creditor', 'note']


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = ['user', 'creditor', 'total_amount', 'paid_amount', 'due_date', 'status', 'created_at']
    list_filter = ['status', 'due_date']
    search_fields = ['user__username', 'creditor', 'description']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'customer_name', 'date', 'payment_method', 'created_at']
    list_filter = ['payment_method', 'date']
    search_fields = ['user__username', 'description', 'customer_name', 'invoice_number']
    date_hierarchy = 'date'


@admin.register(BusinessExpense)
class BusinessExpenseAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'amount', 'date', 'supplier', 'is_tax_deductible', 'created_at']
    list_filter = ['category', 'payment_method', 'is_tax_deductible', 'date']
    search_fields = ['user__username', 'description', 'supplier', 'invoice_number']
    date_hierarchy = 'date'
