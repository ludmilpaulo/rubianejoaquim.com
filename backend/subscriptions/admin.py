from django.contrib import admin
from django.utils import timezone
from datetime import timedelta
from .models import MobileAppSubscription, MobileAppSubscriptionPaymentProof


class MobileAppSubscriptionPaymentProofInline(admin.TabularInline):
    model = MobileAppSubscriptionPaymentProof
    extra = 0
    readonly_fields = ['created_at', 'reviewed_at', 'reviewed_by', 'status']
    can_delete = True


@admin.register(MobileAppSubscription)
class MobileAppSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'trial_ends_at', 'subscription_ends_at', 'has_access_display', 'created_at']
    list_filter = ['status', 'created_at']
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
        now = timezone.now()
        count = 0
        for proof in queryset:
            if proof.status != 'pending':
                continue
            proof.status = 'approved'
            proof.reviewed_by = request.user
            proof.reviewed_at = now
            proof.save()
            sub = proof.subscription
            if sub.subscription_ends_at and sub.subscription_ends_at > now:
                sub.subscription_ends_at += timedelta(days=30)
            else:
                sub.subscription_ends_at = now + timedelta(days=30)
            sub.status = 'active'
            sub.expiry_reminder_sent_at = None  # reset para poder enviar novo aviso
            sub.save()
            count += 1
        self.message_user(request, f'{count} comprovativo(s) aprovado(s). Subscrição ativada/renovada 30 dias.')

    @admin.action(description='Rejeitar comprovativo')
    def reject_payment(self, request, queryset):
        now = timezone.now()
        for proof in queryset:
            proof.status = 'rejected'
            proof.reviewed_by = request.user
            proof.reviewed_at = now
            proof.save()
        self.message_user(request, f'{queryset.count()} comprovativo(s) rejeitado(s).')
