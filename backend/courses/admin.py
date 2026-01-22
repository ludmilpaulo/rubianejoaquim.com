from django.contrib import admin
from .models import (
    Course, Lesson, LessonAttachment, Enrollment, PaymentProof, Progress,
    Question, Choice, LessonQuiz, LessonQuizQuestion, FinalExam, FinalExamQuestion,
    UserQuizAnswer, UserExamAnswer, QuizResult, ExamResult
)


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


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2
    fields = ['choice_text', 'is_correct', 'order']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_text', 'order', 'created_at']
    search_fields = ['question_text']
    inlines = [ChoiceInline]
    ordering = ['order', 'created_at']


class LessonQuizQuestionInline(admin.TabularInline):
    model = LessonQuizQuestion
    extra = 1
    fields = ['question', 'points', 'order']


@admin.register(LessonQuiz)
class LessonQuizAdmin(admin.ModelAdmin):
    list_display = ['lesson', 'title', 'passing_score', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['lesson__title', 'title']
    inlines = [LessonQuizQuestionInline]


class FinalExamQuestionInline(admin.TabularInline):
    model = FinalExamQuestion
    extra = 1
    fields = ['question', 'points', 'order']


@admin.register(FinalExam)
class FinalExamAdmin(admin.ModelAdmin):
    list_display = ['course', 'title', 'passing_score', 'max_attempts', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['course__title', 'title']
    inlines = [FinalExamQuestionInline]


@admin.register(QuizResult)
class QuizResultAdmin(admin.ModelAdmin):
    list_display = ['user', 'quiz', 'score', 'passed', 'completed_at']
    list_filter = ['passed', 'completed_at']
    search_fields = ['user__email', 'quiz__lesson__title']
    readonly_fields = ['score', 'total_questions', 'correct_answers', 'passed']


@admin.register(ExamResult)
class ExamResultAdmin(admin.ModelAdmin):
    list_display = ['user', 'exam', 'attempt_number', 'score', 'passed', 'completed_at']
    list_filter = ['passed', 'completed_at']
    search_fields = ['user__email', 'exam__course__title']
    readonly_fields = ['score', 'total_questions', 'correct_answers', 'passed']
