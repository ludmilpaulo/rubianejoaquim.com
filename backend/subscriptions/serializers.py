from rest_framework import serializers
from .models import MobileAppSubscription, MobileAppSubscriptionPaymentProof


class MobileAppSubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = MobileAppSubscription
        fields = [
            'id', 'status', 'trial_ends_at', 'subscription_ends_at',
            'has_access', 'days_until_expiry',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'trial_ends_at', 'subscription_ends_at', 'created_at', 'updated_at']


class MobileAppSubscriptionPaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileAppSubscriptionPaymentProof
        fields = ['id', 'subscription', 'file', 'notes', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']


class MobileAppSubscriptionPaymentProofUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileAppSubscriptionPaymentProof
        fields = ['file', 'notes']


# Admin serializers (include user info, reviewed_by)
class AdminMobileAppSubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = MobileAppSubscription
        fields = [
            'id', 'user', 'user_email', 'user_name', 'status', 'trial_ends_at', 'subscription_ends_at',
            'has_access', 'days_until_expiry', 'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        return f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip() or obj.user.username


class AdminMobileAppSubscriptionPaymentProofSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='subscription.user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = MobileAppSubscriptionPaymentProof
        fields = [
            'id', 'subscription', 'user_email', 'user_name', 'file', 'notes', 'status',
            'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_email'
        ]
        read_only_fields = ['status', 'created_at', 'reviewed_at', 'reviewed_by']

    def get_user_name(self, obj):
        u = obj.subscription.user
        return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None
