from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from .models import (
    FinanceSpace,
    FinanceSpaceMember,
    SharedGoal,
    SharedBudget,
    SharedContribution,
    FamilyEntry,
    FamilyEntryShare,
    FamilySettlement,
    FamilyActivity,
)


class FinanceSpaceMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = FinanceSpaceMember
        fields = ['id', 'user', 'user_email', 'display_name', 'role', 'status', 'joined_at']

    def get_display_name(self, obj):
        user = obj.user
        first = getattr(user, 'first_name', '') or ''
        last = getattr(user, 'last_name', '') or ''
        name = f'{first} {last}'.strip()
        return name or getattr(user, 'email', '') or str(user.pk)


class SharedGoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = SharedGoal
        fields = [
            'id', 'space', 'title', 'target_amount', 'current_amount', 'currency',
            'visibility', 'progress_percentage', 'target_date', 'created_at',
        ]
        read_only_fields = ['current_amount']

    def validate(self, attrs):
        space = attrs.get('space') or getattr(self.instance, 'space', None)
        if space and not attrs.get('currency'):
            attrs['currency'] = space.currency
        return attrs


class SharedBudgetSerializer(serializers.ModelSerializer):
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)
    year = serializers.IntegerField(required=False, min_value=2000, max_value=2100)

    class Meta:
        model = SharedBudget
        fields = [
            'id', 'space', 'name', 'amount', 'spent', 'currency',
            'month', 'year', 'visibility',
        ]
        read_only_fields = ['spent']

    def validate(self, attrs):
        now = timezone.now()
        attrs['month'] = attrs.get('month') or now.month
        attrs['year'] = attrs.get('year') or now.year
        space = attrs.get('space') or getattr(self.instance, 'space', None)
        if space and not attrs.get('currency'):
            attrs['currency'] = space.currency
        return attrs


class SharedContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedContribution
        fields = [
            'id', 'goal', 'user', 'amount', 'currency', 'converted_amount',
            'exchange_rate', 'exchange_rate_source', 'note', 'created_at',
        ]
        read_only_fields = ['user', 'converted_amount', 'exchange_rate', 'exchange_rate_source']


class FamilyEntryShareSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyEntryShare
        fields = ['id', 'user', 'share_amount', 'settled']


class FamilyEntrySerializer(serializers.ModelSerializer):
    shares = FamilyEntryShareSerializer(many=True, read_only=True)
    paid_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FamilyEntry
        fields = [
            'id', 'space', 'user', 'kind', 'title', 'category', 'amount', 'currency',
            'converted_amount', 'exchange_rate', 'exchange_rate_source',
            'exchange_rate_timestamp', 'visibility', 'paid_by', 'paid_by_name',
            'due_date', 'date', 'notes', 'shares', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'user', 'converted_amount', 'exchange_rate', 'exchange_rate_source',
            'exchange_rate_timestamp', 'paid_by_name', 'created_at', 'updated_at',
        ]

    def get_paid_by_name(self, obj):
        user = obj.paid_by or obj.user
        if not user:
            return ''
        first = getattr(user, 'first_name', '') or ''
        last = getattr(user, 'last_name', '') or ''
        name = f'{first} {last}'.strip()
        return name or getattr(user, 'email', '') or str(user.pk)


class FamilySettlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilySettlement
        fields = [
            'id', 'space', 'from_user', 'to_user', 'amount', 'currency',
            'status', 'created_at', 'paid_at',
        ]
        read_only_fields = ['created_at', 'paid_at']


class FamilyActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilyActivity
        fields = ['id', 'user', 'message', 'created_at']


class FinanceSpaceSerializer(serializers.ModelSerializer):
    members = FinanceSpaceMemberSerializer(many=True, read_only=True)
    shared_goals = SharedGoalSerializer(many=True, read_only=True)
    shared_budgets = SharedBudgetSerializer(many=True, read_only=True)
    invite_url = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = FinanceSpace
        fields = [
            'id', 'name', 'owner', 'invite_code', 'invite_url', 'currency',
            'description', 'require_approval', 'invite_expires_at', 'members',
            'member_count', 'shared_goals', 'shared_budgets', 'created_at',
        ]
        read_only_fields = ['owner', 'invite_code', 'invite_url', 'invite_expires_at']

    def get_invite_url(self, obj):
        base = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com').rstrip('/')
        return f'{base}/family/join/{obj.invite_code}'

    def get_member_count(self, obj):
        return obj.members.filter(status='active').count()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            data.pop('shared_goals', None)
            data.pop('shared_budgets', None)
            data['members'] = []
            return data
        from .permissions import active_membership
        if not active_membership(user, instance):
            data.pop('shared_goals', None)
            data.pop('shared_budgets', None)
            data['members'] = []
        return data


class FamilyPreviewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    currency = serializers.CharField()
    member_count = serializers.IntegerField()
    require_approval = serializers.BooleanField()
