from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import MentorshipPackage, MentorshipRequest, MentorshipPaymentProof
from .serializers import (
    MentorshipPackageSerializer, MentorshipRequestSerializer,
    MentorshipPaymentProofSerializer
)


class MentorshipPackageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MentorshipPackage.objects.filter(is_active=True)
    serializer_class = MentorshipPackageSerializer
    permission_classes = [AllowAny]


class MentorshipRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MentorshipRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MentorshipRequest.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Criar pedido de mentoria"""
        package_id = request.data.get('package_id')
        package = get_object_or_404(MentorshipPackage, id=package_id, is_active=True)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, package=package)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='upload-payment-proof')
    def upload_payment_proof(self, request, pk=None):
        """Upload de comprovativo de pagamento"""
        mentorship_request = self.get_object()
        if mentorship_request.user != request.user:
            return Response(
                {'error': 'Não autorizado.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar se já existe
        if hasattr(mentorship_request, 'payment_proof'):
            return Response(
                {'error': 'Já existe um comprovativo para este pedido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES.get('file')
        notes = request.data.get('notes', '')

        if not file:
            return Response(
                {'error': 'Ficheiro é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        proof = MentorshipPaymentProof.objects.create(
            request=mentorship_request,
            file=file,
            notes=notes
        )

        serializer = MentorshipPaymentProofSerializer(proof)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
