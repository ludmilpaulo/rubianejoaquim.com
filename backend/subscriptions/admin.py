from django.contrib import admin
from django.utils import timezone
from datetime import timedelta
from .models import (
    MobileAppSubscription,
    MobileAppSubscriptionPaymentProof,
    PaymentGatewayConfig,
    SubscriptionAdminAuditLog,
    SubscriptionBillingSettings,
    SubscriptionPayment,
)


class MobileAppSubscriptionPaymentProofInline(admin.TabularInline):
    model = MobileAppSubscriptionPaymentProof
    extra = 0
    readonly_fields = ['created_at', 'reviewed_at', 'reviewed_by', 'status']
    can_delete = True


@admin.register(MobileAppSubscription)
class MobileAppSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'plan_tier', 'trial_ends_at', 'subscription_ends_at', 'has_access_display', 'created_at']
    list_filter = ['status', 'plan_tier', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'expiry_reminder_sent_at']
    inlines = [MobileAppSubscriptionPaymentProofInline]
    actions = ['deactivate_subscription', 'extend_subscription_30_days']

    def has_access_display(self, obj):
        return obj.has_access
    has_access_display.boolean = True
    has_access_display.short_description = 'Tem acesso'

    @admin.action(description='Desativar subscrição')
    def deactivate_subscription(self, request, queryset):
        for sub in queryset:
            sub.status = 'cancelled'
            sub.save()
        self.message_user(request, f'{queryset.count()} subscrição(ões) desativada(s).')

    @admin.action(description='Estender 30 dias')
    def extend_subscription_30_days(self, request, queryset):
        now = timezone.now()
        for sub in queryset:
            if sub.subscription_ends_at and sub.subscription_ends_at > now:
                sub.subscription_ends_at += timedelta(days=30)
            else:
                sub.subscription_ends_at = now + timedelta(days=30)
            sub.status = 'active'
            sub.save()
        self.message_user(request, f'{queryset.count()} subscrição(ões) estendida(s) 30 dias.')


@admin.register(MobileAppSubscriptionPaymentProof)
class MobileAppSubscriptionPaymentProofAdmin(admin.ModelAdmin):
    list_display = ['subscription', 'user_email', 'status', 'created_at', 'reviewed_at', 'reviewed_by']
    list_filter = ['status', 'created_at']
    search_fields = ['subscription__user__email', 'notes']
    readonly_fields = ['created_at', 'reviewed_at', 'reviewed_by']
    actions = ['approve_payment', 'reject_payment']

    def user_email(self, obj):
        return obj.subscription.user.email
    user_email.short_description = 'Utilizador'

    @admin.action(description='Aprovar comprovativo (ativar/renovar 30 dias)')
    def approve_payment(self, request, queryset):
        from .payments import create_proof_ledger, fulfill_paid_payment
        count = 0
        for proof in queryset:
            if proof.status not in ('pending', 'info_requested'):
                continue
            proof.status = 'approved'
            proof.reviewed_by = request.user
            proof.reviewed_at = timezone.now()
            proof.save()
            payment = create_proof_ledger(proof)
            fulfill_paid_payment(payment)
            count += 1
        self.message_user(request, f'{count} comprovativo(s) aprovado(s). Subscrição ativada/renovada 30 dias.')

    @admin.action(description='Rejeitar comprovativo')
    def reject_payment(self, request, queryset):
        from .payments import mark_payment_failed
        from .models import SubscriptionPayment
        now = timezone.now()
        for proof in queryset:
            proof.status = 'rejected'
            proof.reviewed_by = request.user
            proof.reviewed_at = now
            proof.save()
            payment = SubscriptionPayment.objects.filter(proof=proof).first()
            if payment:
                mark_payment_failed(payment, status=SubscriptionPayment.STATUS_REJECTED, notify=True)
        self.message_user(request, f'{queryset.count()} comprovativo(s) rejeitado(s).')


@admin.register(SubscriptionAdminAuditLog)
class SubscriptionAdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ['created_at', 'admin', 'action', 'customer_email', 'result', 'ip_address']
    list_filter = ['action', 'result', 'created_at']
    search_fields = ['customer_email', 'action', 'admin__email']
    readonly_fields = [
        'admin', 'action', 'subscription', 'payment_proof', 'customer_email',
        'result', 'details', 'ip_address', 'user_agent', 'created_at',
    ]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = [
        'external_id', 'user', 'method', 'gateway', 'status', 'amount', 'currency', 'created_at',
    ]
    list_filter = ['status', 'method', 'gateway']
    search_fields = ['external_id', 'user__email', 'paylink_id']
    readonly_fields = [
        'user', 'subscription', 'external_id', 'paylink_id', 'paylink_url',
        'provider_status', 'activated_at', 'created_at', 'updated_at',
    ]


@admin.register(PaymentGatewayConfig)
class PaymentGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ['provider', 'environment', 'is_active', 'app_id', 'updated_at']
    readonly_fields = ['created_at', 'updated_at', 'updated_by']

    def get_exclude(self, request, obj=None):
        return ['app_secret', 'webhook_secret']


@admin.register(SubscriptionBillingSettings)
class SubscriptionBillingSettingsAdmin(admin.ModelAdmin):
    list_display = ['monthly_price_aoa', 'monthly_price_zar', 'updated_at']

