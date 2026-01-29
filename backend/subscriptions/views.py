from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from django.conf import settings
from datetime import timedelta

from .models import MobileAppSubscription, MobileAppSubscriptionPaymentProof
from .serializers import (
    MobileAppSubscriptionSerializer,
    MobileAppSubscriptionPaymentProofSerializer,
    MobileAppSubscriptionPaymentProofUploadSerializer,
)


class MobileAppSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Ver estado da subscrição do app móvel.
    - GET /api/subscriptions/mobile/ → lista (um por user)
    - GET /api/subscriptions/mobile/me/ → estado atual (has_access, days_until_expiry)
    - POST /api/subscriptions/mobile/subscribe/ → inscrever (1 semana grátis)
    - POST /api/subscriptions/mobile/{id}/upload-proof/ → upload comprovativo
    """
    serializer_class = MobileAppSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MobileAppSubscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='subscribe')
    def subscribe(self, request):
        """Inscrever no app móvel (1 semana grátis). Trial só pode ser usado uma vez."""
        user = request.user
        sub, created = MobileAppSubscription.objects.get_or_create(
            user=user,
            defaults={'status': 'trial'}
        )
        if not created:
            if sub.has_access:
                return Response(
                    {'detail': 'Já tem subscrição ativa ou em período de teste.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Trial só pode ser usado uma vez: se já expirou, cancelou ou trial_ends_at já passou, não reativar
            trial_already_used = (
                sub.status in ('expired', 'cancelled')
                or (sub.status == 'trial' and sub.trial_ends_at and sub.trial_ends_at < timezone.now())
            )
            if trial_already_used:
                return Response(
                    {
                        'detail': 'O seu período de teste já terminou e só pode ser utilizado uma vez. Para continuar a usar o Zenda, efetue o pagamento da subscrição mensal e envie o comprovativo em Perfil.',
                        'code': 'trial_already_used',
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Reativar trial apenas se ainda está em trial e trial_ends_at no futuro (edge case)
            sub.status = 'trial'
            sub.trial_ends_at = timezone.now() + timedelta(days=7)
            sub.subscription_ends_at = None
            sub.expiry_reminder_sent_at = None
            sub.save()
        serializer = self.get_serializer(sub)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Estado da subscrição do utilizador (para o app verificar acesso)."""
        try:
            sub = MobileAppSubscription.objects.get(user=request.user)
        except MobileAppSubscription.DoesNotExist:
            return Response({
                'has_access': False,
                'subscription': None,
                'message': 'Não tem subscrição do app. Use subscribe para começar a semana grátis.'
            })
        serializer = self.get_serializer(sub)
        return Response({
            'has_access': sub.has_access,
            'subscription': serializer.data,
        })

    @action(detail=True, methods=['post'], url_path='upload-proof')
    def upload_proof(self, request, pk=None):
        """Upload de comprovativo de pagamento mensal."""
        subscription = self.get_object()
        if subscription.user != request.user:
            return Response({'error': 'Não autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = MobileAppSubscriptionPaymentProofUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        proof = MobileAppSubscriptionPaymentProof.objects.create(
            subscription=subscription,
            file=serializer.validated_data['file'],
            notes=serializer.validated_data.get('notes', ''),
        )
        return Response(
            MobileAppSubscriptionPaymentProofSerializer(proof).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def payment_info(_request):
    """Informações de pagamento da subscrição mensal (público para o app mostrar)."""
    return Response({
        'monthly_price_kz': getattr(settings, 'SUBSCRIPTION_MONTHLY_PRICE_KZ', 10000),
        'currency': 'Kz',
        'iban': getattr(settings, 'SUBSCRIPTION_IBAN', '0040 0000 4047.9796.1015.9'),
        'payee_name': getattr(settings, 'SUBSCRIPTION_PAYEE_NAME', 'Rubiane Patricia Fernando Joaquim'),
    })
