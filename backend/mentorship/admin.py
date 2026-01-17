from django.contrib import admin
from .models import MentorshipPackage, MentorshipRequest, MentorshipPaymentProof


@admin.register(MentorshipPackage)
class MentorshipPackageAdmin(admin.ModelAdmin):
    list_display = ['title', 'duration_minutes', 'sessions', 'price', 'is_active', 'order']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'description']


@admin.register(MentorshipRequest)
class MentorshipRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'package', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['user__email', 'objective', 'contact']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['approve_request', 'mark_scheduled', 'mark_completed']

    def approve_request(self, request, queryset):
        for req in queryset:
            req.status = 'approved'
            req.save()
        self.message_user(request, f"{queryset.count()} pedido(s) aprovado(s).")
    approve_request.short_description = "Aprovar pedidos selecionados"

    def mark_scheduled(self, request, queryset):
        for req in queryset:
            req.status = 'scheduled'
            req.save()
        self.message_user(request, f"{queryset.count()} pedido(s) marcado(s) como agendado(s).")
    mark_scheduled.short_description = "Marcar como agendado"

    def mark_completed(self, request, queryset):
        for req in queryset:
            req.status = 'completed'
            req.save()
        self.message_user(request, f"{queryset.count()} pedido(s) marcado(s) como concluído(s).")
    mark_completed.short_description = "Marcar como concluído"


@admin.register(MentorshipPaymentProof)
class MentorshipPaymentProofAdmin(admin.ModelAdmin):
    list_display = ['request', 'status', 'created_at', 'reviewed_at', 'reviewed_by']
    list_filter = ['status', 'created_at']
    search_fields = ['request__user__email']
    readonly_fields = ['created_at', 'reviewed_at']
    actions = ['approve_payment', 'reject_payment']

    def approve_payment(self, request, queryset):
        from django.utils import timezone
        for proof in queryset:
            proof.status = 'approved'
            proof.reviewed_by = request.user
            proof.reviewed_at = timezone.now()
            proof.save()
            # Aprovar request também
            mentorship_request = proof.request
            if mentorship_request.status == 'pending':
                mentorship_request.status = 'approved'
                mentorship_request.save()
        self.message_user(request, f"{queryset.count()} comprovativo(s) aprovado(s).")
    approve_payment.short_description = "Aprovar comprovativos selecionados"

    def reject_payment(self, request, queryset):
        from django.utils import timezone
        for proof in queryset:
            proof.status = 'rejected'
            proof.reviewed_by = request.user
            proof.reviewed_at = timezone.now()
            proof.save()
        self.message_user(request, f"{queryset.count()} comprovativo(s) rejeitado(s).")
    reject_payment.short_description = "Rejeitar comprovativos selecionados"
