from django.contrib import admin
from .models import Course, Lesson, LessonAttachment, Enrollment, PaymentProof, Progress


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'is_active', 'order', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}


class LessonAttachmentInline(admin.TabularInline):
    model = LessonAttachment
    extra = 1


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'is_free', 'order', 'duration']
    list_filter = ['is_free', 'course', 'created_at']
    search_fields = ['title', 'description']
    inlines = [LessonAttachmentInline]
    prepopulated_fields = {'slug': ('title',)}


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'status', 'enrolled_at', 'activated_at']
    list_filter = ['status', 'enrolled_at']
    search_fields = ['user__email', 'course__title']
    readonly_fields = ['enrolled_at', 'activated_at']


@admin.register(PaymentProof)
class PaymentProofAdmin(admin.ModelAdmin):
    list_display = ['enrollment', 'status', 'created_at', 'reviewed_at', 'reviewed_by']
    list_filter = ['status', 'created_at']
    search_fields = ['enrollment__user__email', 'enrollment__course__title']
    readonly_fields = ['created_at', 'reviewed_at']
    actions = ['approve_payment', 'reject_payment']

    def approve_payment(self, request, queryset):
        from django.utils import timezone
        for proof in queryset:
            proof.status = 'approved'
            proof.reviewed_by = request.user
            proof.reviewed_at = timezone.now()
            proof.save()
            # Ativar enrollment
            enrollment = proof.enrollment
            enrollment.status = 'active'
            enrollment.activated_at = timezone.now()
            enrollment.save()
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


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'completed', 'updated_at']
    list_filter = ['completed', 'updated_at']
    search_fields = ['user__email', 'lesson__title']
