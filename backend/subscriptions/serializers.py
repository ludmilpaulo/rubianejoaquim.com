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
