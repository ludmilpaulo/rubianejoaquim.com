from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MentorshipPackageViewSet, MentorshipRequestViewSet
from .admin_views import (
    AdminMentorshipPackageViewSet, AdminMentorshipRequestViewSet,
    AdminMentorshipPaymentProofViewSet
)

router = DefaultRouter()
router.register(r'package', MentorshipPackageViewSet, basename='mentorship-package')
router.register(r'request', MentorshipRequestViewSet, basename='mentorship-request')

# Admin routes
admin_router = DefaultRouter()
admin_router.register(r'packages', AdminMentorshipPackageViewSet, basename='admin-mentorship-package')
admin_router.register(r'requests', AdminMentorshipRequestViewSet, basename='admin-mentorship-request')
admin_router.register(r'payment-proofs', AdminMentorshipPaymentProofViewSet, basename='admin-mentorship-payment-proof')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
]
