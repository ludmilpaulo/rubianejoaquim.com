from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MobileAppSubscriptionViewSet, payment_info
from .admin_views import (
    AdminMobileAppSubscriptionViewSet,
    AdminMobileAppSubscriptionPaymentProofViewSet,
    AdminPaymentGatewayConfigViewSet,
    AdminSubscriptionPaymentViewSet,
)
from .iap_views import verify_apple_iap
from .payment_views import (
    IkhokhaWebhookView,
    SubscriptionPaymentViewSet,
    checkout_options,
    create_payment_session,
    sync_payment,
)

router = DefaultRouter()
router.register(r'mobile', MobileAppSubscriptionViewSet, basename='mobile-subscription')
router.register(r'payments', SubscriptionPaymentViewSet, basename='subscription-payment')

admin_router = DefaultRouter()
admin_router.register(r'subscriptions', AdminMobileAppSubscriptionViewSet, basename='admin-mobile-subscription')
admin_router.register(r'payment-proofs', AdminMobileAppSubscriptionPaymentProofViewSet, basename='admin-mobile-payment-proof')
admin_router.register(r'payments', AdminSubscriptionPaymentViewSet, basename='admin-subscription-payment')
admin_router.register(r'gateway-config', AdminPaymentGatewayConfigViewSet, basename='admin-gateway-config')

urlpatterns = [
    path('mobile/payment-info/', payment_info),
    path('checkout-options/', checkout_options),
    path('payments/create-session/', create_payment_session),
    path('payments/sync/', sync_payment),
    path('iap/verify-apple/', verify_apple_iap),
    path('ikhokha/webhook/', IkhokhaWebhookView.as_view()),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
