from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MobileAppSubscriptionViewSet, payment_info
from .admin_views import AdminMobileAppSubscriptionViewSet, AdminMobileAppSubscriptionPaymentProofViewSet
from .iap_views import verify_apple_iap

router = DefaultRouter()
router.register(r'mobile', MobileAppSubscriptionViewSet, basename='mobile-subscription')

admin_router = DefaultRouter()
admin_router.register(r'subscriptions', AdminMobileAppSubscriptionViewSet, basename='admin-mobile-subscription')
admin_router.register(r'payment-proofs', AdminMobileAppSubscriptionPaymentProofViewSet, basename='admin-mobile-payment-proof')

urlpatterns = [
    path('mobile/payment-info/', payment_info),
    path('iap/verify-apple/', verify_apple_iap),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
