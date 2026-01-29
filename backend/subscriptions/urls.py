from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MobileAppSubscriptionViewSet, payment_info

router = DefaultRouter()
router.register(r'mobile', MobileAppSubscriptionViewSet, basename='mobile-subscription')

urlpatterns = [
    path('mobile/payment-info/', payment_info),
    path('', include(router.urls)),
]
