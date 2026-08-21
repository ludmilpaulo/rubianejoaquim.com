from rest_framework import serializers

from .models import (
    MobileAppSubscription,
    MobileAppSubscriptionPaymentProof,
    PaymentGatewayConfig,
    SubscriptionAdminAuditLog,
    SubscriptionBillingSettings,
    SubscriptionPayment,
)
from .tiers import effective_tier, tier_features
from .services import monthly_price, default_currency, effective_amount, effective_currency


class MobileAppSubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True, allow_null=True)
    effective_tier = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()

    class Meta:
        model = MobileAppSubscription
        fields = [
            'id', 'status', 'plan_tier', 'trial_ends_at', 'subscription_ends_at',
            'has_access', 'days_until_expiry', 'effective_tier', 'features',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'trial_ends_at', 'subscription_ends_at', 'created_at', 'updated_at']

    def get_effective_tier(self, obj):
        return effective_tier(obj)

    def get_features(self, obj):
        return tier_features(effective_tier(obj))


class MobileAppSubscriptionPaymentProofSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileAppSubscriptionPaymentProof
        fields = ['id', 'subscription', 'file', 'notes', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']


class MobileAppSubscriptionPaymentProofUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileAppSubscriptionPaymentProof
        fields = ['file', 'notes']


def _latest_proof(obj):
    proofs = list(obj.payment_proofs.all())
    return proofs[0] if proofs else None


class AdminMobileAppSubscriptionSerializer(serializers.ModelSerializer):
    has_access = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    plan_tier = serializers.CharField(read_only=True)
    display_status = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    transaction_id = serializers.SerializerMethodField()
    start_date = serializers.DateTimeField(source='created_at', read_only=True)
    renewal_date = serializers.SerializerMethodField()

    class Meta:
        model = MobileAppSubscription
        fields = [
            'id', 'user', 'user_email', 'user_name', 'user_phone',
            'status', 'display_status', 'plan_tier',
            'trial_ends_at', 'subscription_ends_at', 'paused_at',
            'has_access', 'days_until_expiry',
            'amount', 'currency', 'payment_method', 'payment_status', 'transaction_id',
            'start_date', 'renewal_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        return f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip() or obj.user.username

    def get_display_status(self, obj):
        return obj.display_status(_latest_proof(obj))

    def get_amount(self, obj):
        proof = _latest_proof(obj)
        return float(effective_amount(proof))

    def get_currency(self, obj):
        proof = _latest_proof(obj)
        return effective_currency(proof)

    def get_payment_method(self, obj):
        proof = _latest_proof(obj)
        if proof:
            return proof.payment_method or 'bank_transfer'
        if obj.status == 'active':
            return 'apple_iap'
        return ''

    def get_payment_status(self, obj):
        proof = _latest_proof(obj)
        if proof:
            if proof.status == 'approved':
                return 'paid'
            if proof.status == 'rejected':
                return 'failed'
            if proof.status == 'info_requested':
                return 'info_requested'
            return 'pending'
        if obj.status == 'active':
            return 'paid'
        return 'none'

    def get_transaction_id(self, obj):
        proof = _latest_proof(obj)
        if proof:
            return proof.transaction_id
        return f'ZND-SUB-{obj.id:06d}'

    def get_renewal_date(self, obj):
        renewal = obj.renewal_at
        return renewal.isoformat() if renewal else None


class AdminMobileAppSubscriptionPaymentProofSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='subscription.user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source='subscription.user.phone', read_only=True)
    reviewed_by_email = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    transaction_id = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    plan_tier = serializers.CharField(source='subscription.plan_tier', read_only=True)

    class Meta:
        model = MobileAppSubscriptionPaymentProof
        fields = [
            'id', 'subscription', 'user_email', 'user_name', 'user_phone',
            'file', 'file_url', 'notes', 'status',
            'amount', 'currency', 'payment_method', 'payment_reference',
            'info_request_message', 'transaction_id', 'plan_tier',
            'created_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_email', 'reviewed_by_name',
        ]
        read_only_fields = ['status', 'created_at', 'reviewed_at', 'reviewed_by']

    def get_user_name(self, obj):
        u = obj.subscription.user
        return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.username

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return None
        u = obj.reviewed_by
        return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email

    def get_transaction_id(self, obj):
        return obj.transaction_id

    def get_amount(self, obj):
        return float(effective_amount(obj))

    def get_currency(self, obj):
        return effective_currency(obj)

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        if request:
            return request.build_absolute_uri(url)
        return url


class AdminAuditLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.SerializerMethodField()
    admin_name = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionAdminAuditLog
        fields = [
            'id', 'action', 'admin', 'admin_email', 'admin_name',
            'subscription', 'payment_proof', 'customer_email',
            'result', 'details', 'ip_address', 'created_at',
        ]
        read_only_fields = fields

    def get_admin_email(self, obj):
        return obj.admin.email if obj.admin else None

    def get_admin_name(self, obj):
        if not obj.admin:
            return None
        u = obj.admin
        return f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email


class AdminMobileAppSubscriptionDetailSerializer(AdminMobileAppSubscriptionSerializer):
    payment_proofs = AdminMobileAppSubscriptionPaymentProofSerializer(many=True, read_only=True)
    audit_logs = serializers.SerializerMethodField()
    billing_cycle = serializers.SerializerMethodField()
    monthly_price = serializers.SerializerMethodField()

    class Meta(AdminMobileAppSubscriptionSerializer.Meta):
        fields = AdminMobileAppSubscriptionSerializer.Meta.fields + [
            'payment_proofs', 'audit_logs', 'billing_cycle', 'monthly_price',
        ]

    def get_audit_logs(self, obj):
        logs = obj.audit_logs.select_related('admin').all()[:30]
        return AdminAuditLogSerializer(logs, many=True).data

    def get_billing_cycle(self, obj):
        return 'monthly'

    def get_monthly_price(self, obj):
        return {
            'amount': float(monthly_price()),
            'currency': default_currency(),
        }


class MoneySerializer(serializers.Serializer):
    amount = serializers.CharField()
    currency = serializers.CharField()
    is_estimate = serializers.BooleanField(required=False)
    tier = serializers.CharField(required=False)


class CheckoutOptionsSerializer(serializers.Serializer):
    country = serializers.CharField(allow_blank=True)
    method = serializers.CharField()
    methods = serializers.ListField(child=serializers.CharField())
    ikhokha_enabled = serializers.BooleanField()
    plan = MoneySerializer()
    charge = MoneySerializer()
    estimate = MoneySerializer(allow_null=True)
    proof_of_payment = serializers.DictField(allow_null=True)


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    transaction_id = serializers.CharField(read_only=True)
    receipt_url = serializers.SerializerMethodField()
    method_label = serializers.SerializerMethodField()
    gateway_label = serializers.SerializerMethodField()
    plan_tier = serializers.CharField(read_only=True)

    class Meta:
        model = SubscriptionPayment
        fields = [
            'id', 'external_id', 'plan_tier', 'country',
            'amount', 'currency', 'plan_amount', 'plan_currency',
            'method', 'method_label', 'gateway', 'gateway_label',
            'status', 'transaction_id', 'paylink_id', 'provider_status',
            'failure_reason', 'receipt_url', 'created_at', 'updated_at', 'activated_at',
        ]
        read_only_fields = fields

    def get_receipt_url(self, obj):
        if not obj.proof_id or not obj.proof.file:
            return None
        request = self.context.get('request')
        url = obj.proof.file.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_method_label(self, obj):
        if obj.method == SubscriptionPayment.METHOD_PROOF:
            return 'Proof of Payment'
        if obj.method == SubscriptionPayment.METHOD_CARD:
            return 'Card'
        if obj.method == SubscriptionPayment.METHOD_APPLE_IAP:
            return 'Apple In-App Purchase'
        return obj.method

    def get_gateway_label(self, obj):
        if obj.gateway == SubscriptionPayment.GATEWAY_IKHOKHA:
            return 'iKhokha'
        if obj.gateway == SubscriptionPayment.GATEWAY_APPLE:
            return 'Apple'
        return ''


class AdminSubscriptionPaymentSerializer(SubscriptionPaymentSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    subscription_id = serializers.IntegerField(source='subscription.id', read_only=True)

    class Meta(SubscriptionPaymentSerializer.Meta):
        fields = SubscriptionPaymentSerializer.Meta.fields + [
            'user', 'user_email', 'user_name', 'subscription_id',
        ]

    def get_user_name(self, obj):
        return f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip() or obj.user.username


class PaymentGatewayConfigPublicSerializer(serializers.Serializer):
    provider = serializers.CharField()
    environment = serializers.CharField()
    is_active = serializers.BooleanField()
    app_id_masked = serializers.CharField(allow_blank=True)
    app_id_set = serializers.BooleanField()
    app_secret_set = serializers.BooleanField()
    webhook_secret_set = serializers.BooleanField()
    api_base_url = serializers.CharField(allow_blank=True)
    payment_url = serializers.CharField(allow_blank=True)
    callback_url = serializers.CharField(allow_blank=True)
    updated_at = serializers.DateTimeField(allow_null=True)


class PaymentGatewayConfigWriteSerializer(serializers.Serializer):
    environment = serializers.ChoiceField(
        choices=[PaymentGatewayConfig.ENV_SANDBOX, PaymentGatewayConfig.ENV_PRODUCTION],
        required=False,
    )
    is_active = serializers.BooleanField(required=False)
    app_id = serializers.CharField(required=False, allow_blank=True, max_length=128)
    app_secret = serializers.CharField(required=False, allow_blank=True)
    webhook_secret = serializers.CharField(required=False, allow_blank=True)
    api_base_url = serializers.CharField(required=False, allow_blank=True, max_length=300)
    payment_url = serializers.CharField(required=False, allow_blank=True, max_length=300)
    callback_url = serializers.CharField(required=False, allow_blank=True, max_length=400)


class BillingSettingsSerializer(serializers.Serializer):
    monthly_price_aoa = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    monthly_price_zar = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    iban = serializers.CharField(allow_blank=True, max_length=64, required=False)
    payee_name = serializers.CharField(allow_blank=True, max_length=200, required=False)

