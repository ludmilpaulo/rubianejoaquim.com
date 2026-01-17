from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, LessonViewSet, EnrollmentViewSet, ProgressViewSet

router = DefaultRouter()
router.register(r'course', CourseViewSet, basename='course')
router.register(r'lesson', LessonViewSet, basename='lesson')
router.register(r'enrollment', EnrollmentViewSet, basename='enrollment')
router.register(r'progress', ProgressViewSet, basename='progress')

urlpatterns = [
    path('', include(router.urls)),
]
