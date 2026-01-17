from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Course, Lesson, Enrollment, PaymentProof, Progress
from .serializers import (
    CourseSerializer, CourseDetailSerializer, LessonSerializer,
    EnrollmentSerializer, PaymentProofSerializer, ProgressSerializer
)


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.filter(is_active=True)
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    @action(detail=False, methods=['get'], url_path='free-lesson')
    def free_lessons(self, request):
        """Lista todas as aulas gratuitas de todos os cursos"""
        lessons = Lesson.objects.filter(is_free=True).select_related('course')
        serializer = LessonSerializer(lessons, many=True, context={'request': request})
        return Response(serializer.data)


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Lesson.objects.all()
        course_id = self.request.query_params.get('course', None)
        if course_id:
            queryset = queryset.filter(course_id=course_id)
        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='mark-completed')
    def mark_completed(self, request, pk=None):
        """Marca aula como concluída"""
        lesson = self.get_object()
        user = request.user

        # Verificar se tem acesso (aula gratuita ou enrollment ativo)
        has_access = lesson.is_free
        if not has_access:
            enrollment = Enrollment.objects.filter(
                user=user,
                course=lesson.course,
                status='active'
            ).first()
            has_access = enrollment is not None

        if not has_access:
            return Response(
                {'error': 'Não tem acesso a esta aula.'},
                status=status.HTTP_403_FORBIDDEN
            )

        progress, created = Progress.objects.get_or_create(
            user=user,
            lesson=lesson,
            defaults={'completed': True}
        )
        if not created:
            progress.completed = True
            progress.save()

        serializer = ProgressSerializer(progress)
        return Response(serializer.data)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Criar enrollment (inscrição)"""
        course_id = request.data.get('course_id')
        course = get_object_or_404(Course, id=course_id, is_active=True)

        # Verificar se já existe
        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course=course,
            defaults={'status': 'pending'}
        )

        if not created:
            return Response(
                {'error': 'Já está inscrito neste curso.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='upload-payment-proof')
    def upload_payment_proof(self, request, pk=None):
        """Upload de comprovativo de pagamento"""
        enrollment = self.get_object()
        if enrollment.user != request.user:
            return Response(
                {'error': 'Não autorizado.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar se já existe
        if hasattr(enrollment, 'payment_proof'):
            return Response(
                {'error': 'Já existe um comprovativo para esta inscrição.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES.get('file')
        notes = request.data.get('notes', '')

        if not file:
            return Response(
                {'error': 'Ficheiro é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        proof = PaymentProof.objects.create(
            enrollment=enrollment,
            file=file,
            notes=notes
        )

        serializer = PaymentProofSerializer(proof)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProgressViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Progress.objects.filter(user=self.request.user)
