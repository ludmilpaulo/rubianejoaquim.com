from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from datetime import timedelta
from .models import (
    MentorshipPackage, MentorshipRequest, MentorshipPaymentProof,
    MentorAvailability, MentorshipSession,
)
from .serializers import (
    MentorshipPackageSerializer, MentorshipRequestSerializer,
    MentorshipPaymentProofSerializer, MentorAvailabilitySerializer,
    MentorshipSessionSerializer,
)
from instructors.permissions import approved_mentor, is_staff_admin
from instructors.models import MentorProfile, InstructorProfile


class MentorshipPackageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MentorshipPackageSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = MentorshipPackage.objects.filter(is_active=True)
        if hasattr(MentorshipPackage, 'status'):
            qs = qs.filter(status=MentorshipPackage.STATUS_PUBLISHED)
        mentor = self.request.query_params.get('mentor')
        if mentor:
            qs = qs.filter(mentor_id=mentor)
        return qs


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

        from subscriptions.billing import is_angola_user
        if not is_angola_user(request.user):
            return Response(
                {'detail': 'International users pay by card (iKhokha). Proof of payment is only for Angola.'},
                status=status.HTTP_400_BAD_REQUEST,
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


class MentorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = MentorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        mentor = approved_mentor(self.request.user)
        if mentor:
            return MentorAvailability.objects.filter(mentor=mentor)
        return MentorAvailability.objects.none()

    def perform_create(self, serializer):
        mentor = approved_mentor(self.request.user)
        serializer.save(mentor=mentor)


class MentorshipSessionViewSet(viewsets.ModelViewSet):
    serializer_class = MentorshipSessionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        mentor = approved_mentor(user)
        if is_staff_admin(user):
            return MentorshipSession.objects.all()
        if mentor:
            return MentorshipSession.objects.filter(mentor=mentor) | MentorshipSession.objects.filter(student=user)
        return MentorshipSession.objects.filter(student=user)

    def create(self, request, *args, **kwargs):
        mentor = MentorProfile.objects.filter(
            pk=request.data.get('mentor'),
            status=InstructorProfile.STATUS_APPROVED,
        ).first()
        if mentor is None:
            return Response({'detail': 'mentor_not_found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        duration = int(serializer.validated_data.get('duration_minutes') or 60)
        starts = serializer.validated_data['starts_at']
        ends = serializer.validated_data.get('ends_at') or (starts + timedelta(minutes=duration))
        overlap = MentorshipSession.objects.filter(
            mentor=mentor,
            status=MentorshipSession.STATUS_SCHEDULED,
            starts_at=starts,
        ).exists()
        if overlap:
            return Response({'detail': 'slot_taken'}, status=status.HTTP_409_CONFLICT)
        try:
            with transaction.atomic():
                session = MentorshipSession.objects.create(
                    mentor=mentor,
                    student=request.user,
                    package_id=request.data.get('package') or None,
                    request_id=request.data.get('request') or None,
                    starts_at=starts,
                    ends_at=ends,
                    duration_minutes=duration,
                    meeting_provider=serializer.validated_data.get('meeting_provider') or 'custom',
                    notes=serializer.validated_data.get('notes', ''),
                )
        except IntegrityError:
            return Response({'detail': 'slot_taken'}, status=status.HTTP_409_CONFLICT)
        return Response(MentorshipSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def meeting_url(self, request, pk=None):
        session = self.get_object()
        mentor = approved_mentor(request.user)
        if not is_staff_admin(request.user) and (mentor is None or session.mentor_id != mentor.id):
            return Response({'detail': 'not_owner'}, status=status.HTTP_403_FORBIDDEN)
        session.meeting_url = request.data.get('meeting_url', '')
        session.meeting_provider = request.data.get('meeting_provider', session.meeting_provider)
        session.save(update_fields=['meeting_url', 'meeting_provider'])
        return Response(MentorshipSessionSerializer(session).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        session = self.get_object()
        mentor = approved_mentor(request.user)
        is_student = session.student_id == request.user.id
        is_mentor = mentor is not None and session.mentor_id == mentor.id
        if not (is_staff_admin(request.user) or is_student or is_mentor):
            return Response({'detail': 'not_owner'}, status=status.HTTP_403_FORBIDDEN)
        if session.status in (MentorshipSession.STATUS_COMPLETED, MentorshipSession.STATUS_CANCELLED):
            return Response({'detail': 'cannot_cancel'}, status=status.HTTP_400_BAD_REQUEST)
        session.status = MentorshipSession.STATUS_CANCELLED
        session.save(update_fields=['status'])
        return Response(MentorshipSessionSerializer(session).data)


class PublicMentorAvailabilityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MentorAvailabilitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        mentor_id = self.request.query_params.get('mentor')
        qs = MentorAvailability.objects.filter(is_active=True)
        if mentor_id:
            qs = qs.filter(mentor_id=mentor_id)
        return qs
