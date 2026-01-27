from django.contrib import admin
from .models import (
    Category, PersonalExpense, Budget, Goal, Debt,
    Sale, BusinessExpense
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'is_personal', 'is_business', 'created_at']
    list_filter = ['is_personal', 'is_business']
    search_fields = ['name']


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
