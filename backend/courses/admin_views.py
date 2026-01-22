from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.text import slugify
from .models import (
    Course, Lesson, Enrollment, PaymentProof, Progress, LessonAttachment,
    Question, Choice, LessonQuiz, LessonQuizQuestion, FinalExam, FinalExamQuestion,
    UserQuizAnswer, UserExamAnswer, QuizResult, ExamResult
)
from .serializers import (
    CourseSerializer, CourseDetailSerializer, LessonSerializer, AdminLessonSerializer,
    EnrollmentSerializer, PaymentProofSerializer, LessonAttachmentSerializer,
    QuestionSerializer, ChoiceSerializer, LessonQuizSerializer, LessonQuizQuestionSerializer,
    FinalExamSerializer, FinalExamQuestionSerializer,
    UserQuizAnswerSerializer, UserExamAnswerSerializer,
    QuizResultSerializer, ExamResultSerializer
)
from accounts.models import User
from accounts.serializers import UserSerializer

# Try to import mentorship models if available
try:
    from mentorship.models import MentorshipRequest
except ImportError:
    MentorshipRequest = None


class AdminCourseViewSet(viewsets.ModelViewSet):
    """CRUD completo de cursos para admin"""
    queryset = Course.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated()]
        return super().get_permissions()
    
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
        # Garantir que o slug seja gerado se não fornecido
        if not request.data.get('slug') and request.data.get('title'):
            request.data['slug'] = slugify(request.data['title'])
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        # Garantir que o slug seja gerado se não fornecido
        if not request.data.get('slug') and request.data.get('title'):
            request.data['slug'] = slugify(request.data['title'])
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        # Garantir que o slug seja gerado se não fornecido
        if not request.data.get('slug') and request.data.get('title'):
            request.data['slug'] = slugify(request.data['title'])
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().destroy(request, *args, **kwargs)


class AdminLessonViewSet(viewsets.ModelViewSet):
    """CRUD completo de aulas para admin"""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AdminLessonSerializer
        return LessonSerializer
    
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
        course_id = request.query_params.get('course')
        if course_id:
            self.queryset = self.queryset.filter(course_id=course_id)
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().retrieve(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        # Garantir que o slug seja gerado se não fornecido
        if not request.data.get('slug') and request.data.get('title'):
            request.data['slug'] = slugify(request.data['title'])
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        # Garantir que o slug seja gerado se não fornecido
        if not request.data.get('slug') and request.data.get('title'):
            request.data['slug'] = slugify(request.data['title'])
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        # Garantir que o slug seja gerado se não fornecido
        if not request.data.get('slug') and request.data.get('title'):
            request.data['slug'] = slugify(request.data['title'])
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().destroy(request, *args, **kwargs)


class AdminLessonAttachmentViewSet(viewsets.ModelViewSet):
    """CRUD completo de attachments de aulas para admin"""
    queryset = LessonAttachment.objects.all()
    serializer_class = LessonAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def get_queryset(self):
        lesson_id = self.request.query_params.get('lesson')
        if lesson_id:
            return self.queryset.filter(lesson_id=lesson_id)
        return self.queryset
    
    def list(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().retrieve(request, *args, **kwargs)
    
    def create(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        
        # Auto-detect file type if not provided
        if 'file' in request.FILES and 'file_type' not in request.data:
            file = request.FILES['file']
            ext = file.name.split('.')[-1].lower()
            if ext in ['pdf']:
                request.data['file_type'] = 'pdf'
            elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']:
                request.data['file_type'] = 'image'
            elif ext in ['mp3', 'wav', 'ogg', 'm4a']:
                request.data['file_type'] = 'audio'
            elif ext in ['mp4', 'webm', 'mov', 'avi']:
                request.data['file_type'] = 'video'
            else:
                request.data['file_type'] = 'other'
        
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().destroy(request, *args, **kwargs)


class AdminEnrollmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Visualização e gerenciamento de matrículas para admin"""
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
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
        """Aprovar matrícula e ativar acesso"""
        check = self.check_admin()
        if check:
            return check
        
        enrollment = self.get_object()
        enrollment.status = 'active'
        enrollment.activated_at = timezone.now()
        enrollment.save()
        
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancelar matrícula"""
        check = self.check_admin()
        if check:
            return check
        
        enrollment = self.get_object()
        enrollment.status = 'cancelled'
        enrollment.save()
        
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)


class AdminPaymentProofViewSet(viewsets.ReadOnlyModelViewSet):
    """Gerenciamento de comprovantes de pagamento para admin"""
    queryset = PaymentProof.objects.all()
    serializer_class = PaymentProofSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_context(self):
        """Garantir que o contexto da request está disponível para construir URLs absolutas"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
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
    
    def retrieve(self, request, *args, **kwargs):
        check = self.check_admin()
        if check:
            return check
        return super().retrieve(request, *args, **kwargs)
    
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
        
        # Ativar enrollment automaticamente
        enrollment = proof.enrollment
        enrollment.status = 'active'
        enrollment.activated_at = timezone.now()
        enrollment.save()
        
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


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    """Visualização de usuários para admin"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
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
    
    @action(detail=True, methods=['post'], url_path='toggle-staff')
    def toggle_staff(self, request, pk=None):
        """Toggle is_staff status"""
        check = self.check_admin()
        if check:
            return check
        
        if not request.user.is_superuser:
            return Response(
                {'error': 'Apenas superusuários podem alterar permissões.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        user.is_staff = not user.is_staff
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Estatísticas para o dashboard admin"""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {'error': 'Acesso negado. Apenas administradores.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    stats = {
        'total_courses': Course.objects.count(),
        'active_courses': Course.objects.filter(is_active=True).count(),
        'total_lessons': Lesson.objects.count(),
        'free_lessons': Lesson.objects.filter(is_free=True).count(),
        'total_enrollments': Enrollment.objects.count(),
        'active_enrollments': Enrollment.objects.filter(status='active').count(),
        'pending_enrollments': Enrollment.objects.filter(status='pending').count(),
        'total_users': User.objects.count(),
        'total_mentorship_requests': MentorshipRequest.objects.count() if MentorshipRequest else 0,
        'pending_payments': PaymentProof.objects.filter(status='pending').count(),
        'approved_payments': PaymentProof.objects.filter(status='approved').count(),
        'rejected_payments': PaymentProof.objects.filter(status='rejected').count(),
        'total_progress': Progress.objects.filter(completed=True).count(),
    }
    
    # Recent enrollments
    recent_enrollments = Enrollment.objects.select_related('user', 'course').order_by('-enrolled_at')[:10]
    stats['recent_enrollments'] = EnrollmentSerializer(recent_enrollments, many=True).data
    
    # Recent payments
    recent_payments = PaymentProof.objects.select_related('enrollment__user', 'enrollment__course').order_by('-created_at')[:10]
    stats['recent_payments'] = PaymentProofSerializer(recent_payments, many=True).data
    
    return Response(stats)


# Quiz and Exam Admin Views
class AdminQuestionViewSet(viewsets.ModelViewSet):
    """CRUD de perguntas para admin"""
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer
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


class AdminChoiceViewSet(viewsets.ModelViewSet):
    """CRUD de opções de resposta para admin"""
    queryset = Choice.objects.all()
    serializer_class = ChoiceSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def get_queryset(self):
        question_id = self.request.query_params.get('question')
        if question_id:
            return self.queryset.filter(question_id=question_id)
        return self.queryset
    
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


class AdminLessonQuizViewSet(viewsets.ModelViewSet):
    """CRUD de quizzes de aulas para admin"""
    queryset = LessonQuiz.objects.all()
    serializer_class = LessonQuizSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def get_queryset(self):
        lesson_id = self.request.query_params.get('lesson')
        if lesson_id:
            return self.queryset.filter(lesson_id=lesson_id)
        return self.queryset
    
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
    
    @action(detail=True, methods=['post'], url_path='add-question')
    def add_question(self, request, pk=None):
        """Adicionar pergunta ao quiz"""
        check = self.check_admin()
        if check:
            return check
        
        quiz = self.get_object()
        question_id = request.data.get('question_id')
        points = request.data.get('points', 1)
        order = request.data.get('order', quiz.questions.count())
        
        try:
            question = Question.objects.get(id=question_id)
            quiz_question, created = LessonQuizQuestion.objects.get_or_create(
                quiz=quiz,
                question=question,
                defaults={'points': points, 'order': order}
            )
            serializer = LessonQuizQuestionSerializer(quiz_question)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Question.DoesNotExist:
            return Response({'error': 'Pergunta não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['delete'], url_path='remove-question/(?P<question_id>[^/.]+)')
    def remove_question(self, request, pk=None, question_id=None):
        """Remover pergunta do quiz"""
        check = self.check_admin()
        if check:
            return check
        
        quiz = self.get_object()
        try:
            quiz_question = LessonQuizQuestion.objects.get(quiz=quiz, question_id=question_id)
            quiz_question.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except LessonQuizQuestion.DoesNotExist:
            return Response({'error': 'Pergunta não encontrada no quiz.'}, status=status.HTTP_404_NOT_FOUND)


class AdminFinalExamViewSet(viewsets.ModelViewSet):
    """CRUD de exames finais para admin"""
    queryset = FinalExam.objects.all()
    serializer_class = FinalExamSerializer
    permission_classes = [IsAuthenticated]
    
    def check_admin(self):
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return Response(
                {'error': 'Acesso negado. Apenas administradores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None
    
    def get_queryset(self):
        course_id = self.request.query_params.get('course')
        if course_id:
            return self.queryset.filter(course_id=course_id)
        return self.queryset
    
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
    
    @action(detail=True, methods=['post'], url_path='add-question')
    def add_question(self, request, pk=None):
        """Adicionar pergunta ao exame"""
        check = self.check_admin()
        if check:
            return check
        
        exam = self.get_object()
        question_id = request.data.get('question_id')
        points = request.data.get('points', 1)
        order = request.data.get('order', exam.questions.count())
        
        try:
            question = Question.objects.get(id=question_id)
            exam_question, created = FinalExamQuestion.objects.get_or_create(
                exam=exam,
                question=question,
                defaults={'points': points, 'order': order}
            )
            serializer = FinalExamQuestionSerializer(exam_question)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Question.DoesNotExist:
            return Response({'error': 'Pergunta não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['delete'], url_path='remove-question/(?P<question_id>[^/.]+)')
    def remove_question(self, request, pk=None, question_id=None):
        """Remover pergunta do exame"""
        check = self.check_admin()
        if check:
            return check
        
        exam = self.get_object()
        try:
            exam_question = FinalExamQuestion.objects.get(exam=exam, question_id=question_id)
            exam_question.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except FinalExamQuestion.DoesNotExist:
            return Response({'error': 'Pergunta não encontrada no exame.'}, status=status.HTTP_404_NOT_FOUND)
