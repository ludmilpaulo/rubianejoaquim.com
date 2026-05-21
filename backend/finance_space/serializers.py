from rest_framework import serializers
from .models import FinanceSpace, FinanceSpaceMember, SharedGoal, SharedBudget, SharedContribution


class FinanceSpaceMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = FinanceSpaceMember
        fields = ['id', 'user', 'user_email', 'role', 'joined_at']


class SharedGoalSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = SharedGoal
        fields = [
            'id', 'space', 'title', 'target_amount', 'current_amount',
            'progress_percentage', 'target_date', 'created_at',
        ]
        read_only_fields = ['current_amount']


class SharedBudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedBudget
        fields = ['id', 'space', 'name', 'amount', 'spent', 'month', 'year']


class SharedContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SharedContribution
        fields = ['id', 'goal', 'user', 'amount', 'note', 'created_at']
        read_only_fields = ['user']


class FinanceSpaceSerializer(serializers.ModelSerializer):
    members = FinanceSpaceMemberSerializer(many=True, read_only=True)
    shared_goals = SharedGoalSerializer(many=True, read_only=True)
    shared_budgets = SharedBudgetSerializer(many=True, read_only=True)

    class Meta:
        model = FinanceSpace
        fields = [
            'id', 'name', 'owner', 'invite_code', 'members',
            'shared_goals', 'shared_budgets', 'created_at',
        ]
        read_only_fields = ['owner', 'invite_code']
