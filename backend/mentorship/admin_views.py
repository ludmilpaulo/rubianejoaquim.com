from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from .models import MentorshipPackage, MentorshipRequest, MentorshipPaymentProof
from .serializers import (
    MentorshipPackageSerializer, MentorshipRequestSerializer,
    MentorshipPaymentProofSerializer
)


class AdminMentorshipPackageViewSet(viewsets.ModelViewSet):
    """CRUD completo de pacotes de mentoria para admin"""
    queryset = MentorshipPackage.objects.all()
    serializer_class = MentorshipPackageSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def list(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().list(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().destroy(request, *args, **kwargs)


class AdminMentorshipRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """Visualização e gerenciamento de pedidos de mentoria para admin"""
    queryset = MentorshipRequest.objects.all()
    serializer_class = MentorshipRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def list(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        
        queryset = self.queryset
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        self.queryset = queryset
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Aprovar pedido de mentoria"""
        check = self.check_admin()
        if check:
            return check
        
        mentorship_request = self.get_object()
        mentorship_request.status = 'approved'
        mentorship_request.save()
        
        serializer = self.get_serializer(mentorship_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancelar pedido de mentoria"""
        check = self.check_admin()
        if check:
            return check
        
        mentorship_request = self.get_object()
        mentorship_request.status = 'cancelled'
        mentorship_request.save()
        
        serializer = self.get_serializer(mentorship_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Atualizar status do pedido"""
        check = self.check_admin()
        if check:
            return check
        
        mentorship_request = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if new_status not in ['pending', 'approved', 'scheduled', 'completed', 'cancelled']:
            return Response(
                {'error': 'Status inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        mentorship_request.status = new_status
        if notes:
            mentorship_request.notes = notes
        mentorship_request.save()
        
        serializer = self.get_serializer(mentorship_request)
        return Response(serializer.data)


class AdminMentorshipPaymentProofViewSet(viewsets.ReadOnlyModelViewSet):
    """Gerenciamento de comprovantes de pagamento de mentoria para admin"""
    queryset = MentorshipPaymentProof.objects.all()
    serializer_class = MentorshipPaymentProofSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def list(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        
        queryset = self.queryset
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        self.queryset = queryset
        return super().list(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Aprovar comprovante de pagamento"""
        check = self.check_admin()
        if check:
            return check
        
        proof = self.get_object()
        proof.status = 'approved'
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        proof.save()
        
        # Ativar pedido automaticamente
        mentorship_request = proof.request
        mentorship_request.status = 'approved'
        mentorship_request.save()
        
        serializer = self.get_serializer(proof)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Rejeitar comprovante de pagamento"""
        check = self.check_admin()
        if check:
            return check
        
        proof = self.get_object()
        proof.status = 'rejected'
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        proof.save()
        
        serializer = self.get_serializer(proof)
        return Response(serializer.data)
