from rest_framework import serializers
from decimal import Decimal
from .models import (
    Category, PersonalExpense, PersonalIncome, Budget, Goal, GoalContribution,
    Debt, DebtPayment,
    Sale, BusinessExpense, ExchangeRate, UserFavoriteCurrency,
    FinancialHealthSnapshot, Receipt,
    MonthlyFinancialPlan, MonthlyPlanItem,
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
            'amount', 'description', 'date', 'currency', 'is_recurring', 'recurrence',
            'notes', 'receipt_url', 'payment_method', 'budget',
            'exchange_rate', 'converted_amount', 'display_currency',
            'exchange_rate_source', 'exchange_rate_timestamp',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'exchange_rate', 'converted_amount', 'display_currency',
            'exchange_rate_source', 'exchange_rate_timestamp',
            'created_at', 'updated_at',
        ]


class PersonalIncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    class Meta:
        model = PersonalIncome
        fields = [
            'id', 'category', 'category_name', 'amount', 'description', 'date',
            'source_type', 'currency', 'is_recurring', 'recurrence', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = [
            'id',
            'base_currency',
            'target_currency',
            'rate',
            'source',
            'provider_updated_at',
            'updated_at',
        ]


class UserFavoriteCurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFavoriteCurrency
        fields = ['id', 'currency_code', 'order']


class BudgetSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    spent = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_spent(self, obj):
        """Return spent as a string to avoid Decimal serialization issues"""
        try:
            spent_value = obj.spent
            if isinstance(spent_value, Decimal):
                return str(spent_value.quantize(Decimal('0.01')))
            return str(spent_value) if spent_value is not None else '0.00'
        except Exception:
            return '0.00'

    def get_remaining(self, obj):
        """Return remaining as a string to avoid Decimal serialization issues"""
        try:
            remaining_value = obj.remaining
            if isinstance(remaining_value, Decimal):
                return str(remaining_value.quantize(Decimal('0.01')))
            return str(remaining_value) if remaining_value is not None else '0.00'
        except Exception:
            return '0.00'

    def get_percentage_used(self, obj):
        """Return percentage_used as a string to avoid Decimal serialization issues"""
        try:
            percentage_value = obj.percentage_used
            if isinstance(percentage_value, Decimal):
                return str(percentage_value.quantize(Decimal('0.01')))
            return str(percentage_value) if percentage_value is not None else '0.00'
        except Exception:
            return '0.00'

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
            'id', 'category', 'category_name', 'amount', 'currency',
            'period_type', 'date', 'start_date', 'end_date',
            'month', 'year',
            'description', 'spent', 'remaining', 'percentage_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class GoalContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalContribution
        fields = [
            'id', 'amount', 'currency', 'exchange_rate', 'converted_amount',
            'exchange_rate_source', 'exchange_rate_timestamp',
            'note', 'created_at',
        ]
        read_only_fields = [
            'created_at', 'exchange_rate', 'converted_amount',
            'exchange_rate_source', 'exchange_rate_timestamp',
        ]


class GoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    contributions = GoalContributionSerializer(many=True, read_only=True)
    reminder_time = serializers.TimeField(
        required=False,
        allow_null=True,
        format='%H:%M',
        input_formats=['%H:%M', '%H:%M:%S'],
    )

    class Meta:
        model = Goal
        fields = [
            'id', 'title', 'description', 'target_amount', 'current_amount', 'currency',
            'target_date', 'status', 'progress_percentage', 'remaining_amount',
            'reminder_enabled', 'reminder_time', 'reminder_frequency',
            'reminder_offsets_minutes', 'progress_notified_75', 'progress_notified_100',
            'contributions', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'progress_notified_75', 'progress_notified_100',
        ]

    def validate_reminder_offsets_minutes(self, value):
        allowed = {10, 30, 60, 1440}
        if value in (None, '', []):
            return [10]
        if not isinstance(value, list):
            raise serializers.ValidationError('Must be a list of minutes.')
        cleaned: list[int] = []
        for item in value:
            try:
                minutes = int(item)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError('Offsets must be integers.') from exc
            if minutes not in allowed:
                raise serializers.ValidationError('Supported offsets: 10, 30, 60, 1440.')
            if minutes not in cleaned:
                cleaned.append(minutes)
        return cleaned or [10]

    def validate_reminder_frequency(self, value):
        if value in (None, ''):
            return 'once'
        if value not in ('once', 'daily', 'weekly'):
            raise serializers.ValidationError('Invalid reminder frequency.')
        return value


class DebtPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtPayment
        fields = [
            'id', 'amount', 'currency', 'exchange_rate', 'converted_amount',
            'exchange_rate_source', 'exchange_rate_timestamp', 'status',
            'payment_date', 'note', 'created_at',
        ]
        read_only_fields = [
            'created_at', 'exchange_rate', 'converted_amount',
            'exchange_rate_source', 'exchange_rate_timestamp', 'status',
        ]


class DebtSerializer(serializers.ModelSerializer):
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    payments = DebtPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Debt
        fields = [
            'id', 'creditor', 'total_amount', 'paid_amount', 'currency', 'interest_rate',
            'due_date', 'description', 'notes', 'status', 'remaining_amount', 'progress_percentage',
            'payments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# ==================== BUSINESS FINANCE ====================

class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = [
            'id', 'amount', 'currency', 'description', 'customer_name', 'date',
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
            'amount', 'currency', 'description', 'date', 'payment_method', 'supplier',
            'invoice_number', 'is_tax_deductible', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class FinancialHealthSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialHealthSnapshot
        fields = ['id', 'month', 'year', 'score', 'grade', 'components', 'recorded_at']


class ReceiptSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        request = self.context.get('request')
        if not request or not obj.file:
            return None
        from finance.receipt_storage import get_receipt_file_url
        return get_receipt_file_url(obj, request)

    class Meta:
        model = Receipt
        fields = [
            'id', 'file', 'file_url', 'merchant', 'merchant_address', 'amount', 'tax_amount',
            'currency', 'receipt_date', 'receipt_time', 'receipt_number', 'items',
            'payment_method', 'category', 'suggested_category', 'scanned_text',
            'confidence_score', 'status', 'linked_expense', 'is_business',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'status', 'linked_expense', 'confidence_score', 'file_url',
            'created_at', 'updated_at',
        ]


class ReceiptCreateExpenseSerializer(serializers.Serializer):
    category_id = serializers.IntegerField(required=False, allow_null=True)
    budget_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    currency = serializers.CharField(max_length=3, required=False)
    date = serializers.DateField(required=False)
    payment_method = serializers.CharField(max_length=50, required=False)
    confirmed_low_confidence = serializers.BooleanField(default=False)


class MonthlyPlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyPlanItem
        fields = ['id', 'key', 'label', 'amount', 'bucket', 'sort_order']


class MonthlyFinancialPlanSerializer(serializers.ModelSerializer):
    items = MonthlyPlanItemSerializer(many=True, required=False)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyFinancialPlan
        fields = [
            'id', 'month', 'year', 'salary', 'spending_limit', 'savings_target',
            'currency', 'notes', 'items', 'progress',
            'last_budget_alert_level', 'created_at', 'updated_at',
        ]
        read_only_fields = ['last_budget_alert_level', 'created_at', 'updated_at']

    def get_progress(self, obj):
        from finance.budget_alerts import compute_plan_progress
        return compute_plan_progress(obj)

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        plan = MonthlyFinancialPlan.objects.create(**validated_data)
        for idx, item in enumerate(items_data):
            MonthlyPlanItem.objects.create(
                plan=plan,
                key=item.get('key', 'other'),
                label=item.get('label', ''),
                amount=item.get('amount', 0),
                bucket=item.get('bucket', 'needs'),
                sort_order=item.get('sort_order', idx),
            )
        return plan

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if 'spending_limit' in validated_data or 'salary' in validated_data:
            instance.last_budget_alert_level = 0
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for idx, item in enumerate(items_data):
                MonthlyPlanItem.objects.create(
                    plan=instance,
                    key=item.get('key', 'other'),
                    label=item.get('label', ''),
                    amount=item.get('amount', 0),
                    bucket=item.get('bucket', 'needs'),
                    sort_order=item.get('sort_order', idx),
                )
        return instance
