from decimal import Decimal

from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from wallet.models import Beneficiary, PaymentTransaction, Wallet
from wallet.serializers import (
    BeneficiarySerializer,
    PaymentTransactionSerializer,
    TransferRequestSerializer,
    WalletSerializer,
)
from wallet.services import get_or_create_wallet, process_transfer, handle_webhook, wallet_live_enabled


class WalletViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        wallet = get_or_create_wallet(request.user)
        return Response(WalletSerializer(wallet).data)

    @action(detail=False, methods=['get'], url_path='status')
    def wallet_status(self, request):
        return Response({
            'live_enabled': wallet_live_enabled(),
            'kyc_status': get_or_create_wallet(request.user).kyc_status,
            'message': (
                'Live wallet disabled — sandbox only'
                if not wallet_live_enabled()
                else 'Live wallet enabled'
            ),
        })

    @action(detail=False, methods=['post'], url_path='transfer')
    def transfer(self, request):
        ser = TransferRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        direction = 'credit' if data['transaction_type'] == 'deposit' else 'debit'
        meta = {}
        if data.get('simulate'):
            meta['simulate'] = data['simulate']

        tx = process_transfer(
            request.user,
            amount=Decimal(str(data['amount'])),
            currency=data['currency'],
            direction=direction,
            transaction_type=data['transaction_type'],
            idempotency_key=data['idempotency_key'],
            beneficiary_id=data.get('beneficiary_id'),
            metadata=meta,
        )
        code = status.HTTP_201_CREATED if tx.status != 'FAILED' else status.HTTP_400_BAD_REQUEST
        return Response(PaymentTransactionSerializer(tx).data, status=code)

    @action(detail=False, methods=['get'], url_path='transactions')
    def transactions(self, request):
        qs = PaymentTransaction.objects.filter(user=request.user).order_by('-created_at')[:100]
        return Response({'results': PaymentTransactionSerializer(qs, many=True).data})


class BeneficiaryViewSet(viewsets.ModelViewSet):
    serializer_class = BeneficiarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Beneficiary.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WalletWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, provider: str):
        if not wallet_live_enabled():
            return Response({'detail': 'Webhooks disabled in sandbox mode'}, status=status.HTTP_403_FORBIDDEN)
        tx = handle_webhook(provider, request.body, {k: v for k, v in request.headers.items()})
        if not tx:
            return Response({'detail': 'Invalid webhook'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaymentTransactionSerializer(tx).data)
