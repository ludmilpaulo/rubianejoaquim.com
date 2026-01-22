from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet, LessonViewSet, EnrollmentViewSet, ProgressViewSet,
    LessonQuizViewSet, FinalExamViewSet
)
from .admin_views import (
    AdminCourseViewSet, AdminLessonViewSet, AdminLessonAttachmentViewSet,
    AdminEnrollmentViewSet, AdminPaymentProofViewSet, AdminUserViewSet, admin_stats,
    AdminQuestionViewSet, AdminChoiceViewSet, AdminLessonQuizViewSet, AdminFinalExamViewSet
)

router = DefaultRouter()
router.register(r'course', CourseViewSet, basename='course')
router.register(r'lesson', LessonViewSet, basename='lesson')
router.register(r'enrollment', EnrollmentViewSet, basename='enrollment')
router.register(r'progress', ProgressViewSet, basename='progress')
router.register(r'lesson-quiz', LessonQuizViewSet, basename='lesson-quiz')
router.register(r'final-exam', FinalExamViewSet, basename='final-exam')

# Admin routes
admin_router = DefaultRouter()
admin_router.register(r'courses', AdminCourseViewSet, basename='admin-course')
admin_router.register(r'lessons', AdminLessonViewSet, basename='admin-lesson')
admin_router.register(r'lesson-attachments', AdminLessonAttachmentViewSet, basename='admin-lesson-attachment')
admin_router.register(r'enrollments', AdminEnrollmentViewSet, basename='admin-enrollment')
admin_router.register(r'payment-proofs', AdminPaymentProofViewSet, basename='admin-payment-proof')
admin_router.register(r'users', AdminUserViewSet, basename='admin-user')
admin_router.register(r'questions', AdminQuestionViewSet, basename='admin-question')
admin_router.register(r'choices', AdminChoiceViewSet, basename='admin-choice')
admin_router.register(r'lesson-quizzes', AdminLessonQuizViewSet, basename='admin-lesson-quiz')
admin_router.register(r'final-exams', AdminFinalExamViewSet, basename='admin-final-exam')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
    path('admin/stats/', admin_stats, name='admin-stats'),
]
