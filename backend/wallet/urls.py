from django.urls import include, path
from rest_framework.routers import DefaultRouter

from wallet.views import BeneficiaryViewSet, WalletViewSet, WalletWebhookView

router = DefaultRouter()
router.register(r'', WalletViewSet, basename='wallet')
router.register(r'beneficiaries', BeneficiaryViewSet, basename='beneficiary')

urlpatterns = [
    path('', include(router.urls)),
    path('webhooks/<str:provider>/', WalletWebhookView.as_view(), name='wallet-webhook'),
]
