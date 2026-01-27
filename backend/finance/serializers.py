from rest_framework import serializers
from .models import (
    Category, PersonalExpense, Budget, Goal, Debt,
    Sale, BusinessExpense
)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'icon', 'color', 'is_personal', 'is_business', 'created_at']


# ==================== PERSONAL FINANCE ====================

class PersonalExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    class Meta:
        model = PersonalExpense
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'amount', 'description', 'date', 'payment_method', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    spent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    percentage_used = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'amount', 'month', 'year',
            'description', 'spent', 'remaining', 'percentage_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class GoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Goal
        fields = [
            'id', 'title', 'description', 'target_amount', 'current_amount',
            'target_date', 'status', 'progress_percentage', 'remaining_amount',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class DebtSerializer(serializers.ModelSerializer):
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    class Meta:
        model = Debt
        fields = [
            'id', 'creditor', 'total_amount', 'paid_amount', 'interest_rate',
            'due_date', 'description', 'status', 'remaining_amount', 'progress_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# ==================== BUSINESS FINANCE ====================

class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = [
            'id', 'amount', 'description', 'customer_name', 'date',
            'payment_method', 'invoice_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BusinessExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)

    class Meta:
        model = BusinessExpense
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'amount', 'description', 'date', 'payment_method', 'supplier',
            'invoice_number', 'is_tax_deductible', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
