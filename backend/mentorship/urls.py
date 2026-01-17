from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MentorshipPackageViewSet, MentorshipRequestViewSet

router = DefaultRouter()
router.register(r'package', MentorshipPackageViewSet, basename='mentorship-package')
router.register(r'request', MentorshipRequestViewSet, basename='mentorship-request')

urlpatterns = [
    path('', include(router.urls)),
]
