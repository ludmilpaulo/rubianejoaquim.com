"""
Admin API for mobile app subscriptions and payment proofs.
Staff/superuser can list subscriptions, list payment proofs, approve/reject proofs, deactivate subscriptions.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta

from .models import MobileAppSubscription, MobileAppSubscriptionPaymentProof
from .serializers import (
    AdminMobileAppSubscriptionSerializer,
    AdminMobileAppSubscriptionPaymentProofSerializer,
)


def check_admin(request):
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {'error': 'Acesso negado. Apenas administradores.'},
            status=status.HTTP_403_FORBIDDEN
        )
    return None


class AdminMobileAppSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """List and manage mobile app subscriptions (admin only)."""
    queryset = MobileAppSubscription.objects.all().select_related('user').order_by('-created_at')
    serializer_class = AdminMobileAppSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        if check_admin(request):
            return check_admin(request)
        status_filter = request.query_params.get('status')
        qs = self.get_queryset()
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        if check_admin(request):
            return check_admin(request)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """Desativar subscrição (status = cancelled)."""
        if check_admin(request):
            return check_admin(request)
        sub = self.get_object()
        sub.status = 'cancelled'
        sub.save()
        serializer = self.get_serializer(sub)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='extend-30-days')
    def extend_30_days(self, request, pk=None):
        """Estender subscrição 30 dias (ativar/renovar)."""
        if check_admin(request):
            return check_admin(request)
        sub = self.get_object()
        now = timezone.now()
        if sub.subscription_ends_at and sub.subscription_ends_at > now:
            sub.subscription_ends_at += timedelta(days=30)
        else:
            sub.subscription_ends_at = now + timedelta(days=30)
        sub.status = 'active'
        sub.save()
        serializer = self.get_serializer(sub)
        return Response(serializer.data)


class AdminMobileAppSubscriptionPaymentProofViewSet(viewsets.ReadOnlyModelViewSet):
    """List and approve/reject payment proofs (admin only)."""
    queryset = MobileAppSubscriptionPaymentProof.objects.all().select_related(
        'subscription', 'subscription__user', 'reviewed_by'
    ).order_by('-created_at')
    serializer_class = AdminMobileAppSubscriptionPaymentProofSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        if check_admin(request):
            return check_admin(request)
        status_filter = request.query_params.get('status')
        qs = self.get_queryset()
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        if check_admin(request):
            return check_admin(request)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Aprovar comprovativo: ativar/renovar subscrição 30 dias."""
        if check_admin(request):
            return check_admin(request)
        proof = self.get_object()
        if proof.status != 'pending':
            return Response(
                {'error': 'Este comprovativo já foi processado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        now = timezone.now()
        proof.status = 'approved'
        proof.reviewed_by = request.user
        proof.reviewed_at = now
        proof.save()
        sub = proof.subscription
        if sub.subscription_ends_at and sub.subscription_ends_at > now:
            sub.subscription_ends_at += timedelta(days=30)
        else:
            sub.subscription_ends_at = now + timedelta(days=30)
        sub.status = 'active'
        sub.expiry_reminder_sent_at = None
        sub.save()
        serializer = self.get_serializer(proof)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Rejeitar comprovativo."""
        if check_admin(request):
            return check_admin(request)
        proof = self.get_object()
        if proof.status != 'pending':
            return Response(
                {'error': 'Este comprovativo já foi processado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        proof.status = 'rejected'
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        proof.save()
        serializer = self.get_serializer(proof)
        return Response(serializer.data)
