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
    category_name = serializers.SerializerMethodField()
    category_icon = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_icon(self, obj):
        return obj.category.icon if obj.category else None

    def get_category_color(self, obj):
        return obj.category.color if obj.category else None

    class Meta:
        model = PersonalExpense
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'amount', 'description', 'date', 'payment_method', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    spent = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    percentage_used = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def validate(self, attrs):
        # Support partial updates
        period_type = attrs.get('period_type', getattr(self.instance, 'period_type', 'monthly'))
        date = attrs.get('date', getattr(self.instance, 'date', None))
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        month = attrs.get('month', getattr(self.instance, 'month', None))
        year = attrs.get('year', getattr(self.instance, 'year', None))

        if period_type == 'daily':
            if not date:
                raise serializers.ValidationError({'date': 'Data é obrigatória para orçamento diário.'})
            if not year or not month:
                # month/year used for filtering and ordering
                attrs['year'] = date.year
                attrs['month'] = date.month
        elif period_type == 'custom':
            if not start_date or not end_date:
                raise serializers.ValidationError({'start_date': 'start_date e end_date são obrigatórios para orçamento personalizado.'})
            if start_date > end_date:
                raise serializers.ValidationError({'end_date': 'end_date deve ser maior ou igual a start_date.'})
            if not year or not month:
                attrs['year'] = start_date.year
                attrs['month'] = start_date.month
        elif period_type == 'yearly':
            if not year:
                raise serializers.ValidationError({'year': 'year é obrigatório para orçamento anual.'})
            # Keep month required by DB schema; use January for yearly
            if not month:
                attrs['month'] = 1
        else:  # monthly
            if not month:
                raise serializers.ValidationError({'month': 'month é obrigatório para orçamento mensal.'})
            if not year:
                raise serializers.ValidationError({'year': 'year é obrigatório para orçamento mensal.'})

        return attrs

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'category_name', 'amount',
            'period_type', 'date', 'start_date', 'end_date',
            'month', 'year',
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
    category_name = serializers.SerializerMethodField()
    category_icon = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_icon(self, obj):
        return obj.category.icon if obj.category else None

    def get_category_color(self, obj):
        return obj.category.color if obj.category else None

    class Meta:
        model = BusinessExpense
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'amount', 'description', 'date', 'payment_method', 'supplier',
            'invoice_number', 'is_tax_deductible', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
