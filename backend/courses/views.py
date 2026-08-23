from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import (
    Course, Lesson, Enrollment, PaymentProof, Progress,
    LessonQuiz, FinalExam, Question, Choice,
    UserQuizAnswer, UserExamAnswer, QuizResult, ExamResult,
    LessonQuizQuestion, FinalExamQuestion,
    ReferralShare, ReferralPoints, UserPoints
)
from .serializers import (
    CourseSerializer, CourseDetailSerializer, LessonSerializer,
    EnrollmentSerializer, PaymentProofSerializer, ProgressSerializer,
    LessonQuizSerializer, FinalExamSerializer, QuestionSerializer,
    UserQuizAnswerSerializer, UserExamAnswerSerializer,
    QuizResultSerializer, ExamResultSerializer,
    ReferralShareSerializer, ReferralPointsSerializer, UserPointsSerializer
)
from django.utils import timezone
from instructors.permissions import IsStaffAdmin, is_staff_admin


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Course.objects.filter(is_active=True, status=Course.STATUS_PUBLISHED).select_related(
            'instructor', 'category'
        )
        params = self.request.query_params
        kind = params.get('kind')
        if kind in (Course.KIND_COURSE, Course.KIND_TUTORIAL):
            qs = qs.filter(kind=kind)
        category = params.get('category')
        if category:
            qs = qs.filter(Q(category__slug=category) | Q(category_id=category))
        language = params.get('language')
        if language:
            qs = qs.filter(language=language)
        level = params.get('level')
        if level:
            qs = qs.filter(level=level)
        instructor = params.get('instructor')
        if instructor:
            qs = qs.filter(Q(instructor__slug=instructor) | Q(instructor_id=instructor))
        if params.get('free') == '1':
            qs = qs.filter(Q(is_free=True) | Q(price=0))
        if params.get('paid') == '1':
            qs = qs.filter(is_free=False, price__gt=0)
        if params.get('featured') == '1':
            qs = qs.filter(is_featured=True)
        if params.get('popular') == '1':
            qs = qs.filter(is_popular=True)
        if params.get('new') == '1':
            qs = qs.filter(is_new=True)
        if params.get('recommended') == '1':
            qs = qs.filter(is_recommended=True)
        search = params.get('q') or params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(short_description__icontains=search)
                | Q(instructor__user__first_name__icontains=search)
                | Q(instructor__user__last_name__icontains=search)
            )
        min_rating = params.get('rating')
        if min_rating:
            qs = qs.filter(rating_avg__gte=min_rating)
        ordering = params.get('ordering')
        if ordering in ('price', '-price', 'rating_avg', '-rating_avg', 'created_at', '-created_at'):
            qs = qs.order_by(ordering)
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    @action(detail=False, methods=['get'], url_path='free-lesson')
    def free_lessons(self, request):
        """Lista todas as aulas gratuitas de todos os cursos"""
        lessons = Lesson.objects.filter(
            is_free=True,
            course__is_active=True,
            course__status=Course.STATUS_PUBLISHED,
        ).select_related('course')
        serializer = LessonSerializer(lessons, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def marketplace(self, request):
        """Aggregated marketplace homepage sections from real published content."""
        base = self.get_queryset()
        def pack(qs):
            return CourseSerializer(qs[:8], many=True, context={'request': request}).data

        popular = base.filter(is_popular=True)
        if not popular.exists():
            popular = base.order_by('-rating_count', '-created_at')
        newest = base.filter(is_new=True)
        if not newest.exists():
            newest = base.order_by('-created_at')
        from instructors.models import InstructorProfile, MentorProfile
        from instructors.serializers import InstructorPublicSerializer, MentorPublicSerializer
        instructors = InstructorProfile.objects.filter(status='approved').order_by('-rating_avg', '-students_count')[:8]
        mentors = MentorProfile.objects.filter(status='approved').order_by('-rating_avg')[:8]
        return Response({
            'popular': pack(popular),
            'featured': pack(base.filter(is_featured=True)),
            'new': pack(newest),
            'recommended': pack(base.filter(is_recommended=True)),
            'free': pack(base.filter(Q(is_free=True) | Q(price=0))),
            'instructors': InstructorPublicSerializer(instructors, many=True, context={'request': request}).data,
            'mentors': MentorPublicSerializer(mentors, many=True, context={'request': request}).data,
        })


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

        quiz = LessonQuiz.objects.filter(lesson=lesson, is_active=True).first()
        if quiz and not QuizResult.objects.filter(user=user, quiz=quiz, passed=True).exists():
            return Response(
                {'error': 'quiz_not_passed', 'detail': 'Pass the lesson quiz before completing this lesson.'},
                status=status.HTTP_400_BAD_REQUEST,
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

    @action(detail=True, methods=['get'], url_path='quiz-results')
    def quiz_results(self, request, pk=None):
        """Obter todos os resultados de quiz de um curso e calcular a média"""
        enrollment = self.get_object()
        course = enrollment.course
        user = request.user

        # Buscar todos os quizzes do curso
        lessons = course.lessons.all()
        quiz_results = []
        total_score = 0
        total_quizzes = 0

        for lesson in lessons:
            try:
                quiz = LessonQuiz.objects.get(lesson=lesson, is_active=True)
                # Buscar resultado do quiz
                result = QuizResult.objects.filter(user=user, quiz=quiz).first()
                if result:
                    quiz_results.append({
                        'lesson_id': lesson.id,
                        'lesson_title': lesson.title,
                        'quiz_id': quiz.id,
                        'quiz_title': quiz.title,
                        'score': float(result.score),
                        'passed': result.passed,
                        'total_questions': result.total_questions,
                        'correct_answers': result.correct_answers,
                        'passing_score': quiz.passing_score,
                        'completed_at': result.completed_at.isoformat() if result.completed_at else None,
                    })
                    total_score += float(result.score)
                    total_quizzes += 1
                else:
                    # Quiz existe mas ainda não foi feito
                    quiz_results.append({
                        'lesson_id': lesson.id,
                        'lesson_title': lesson.title,
                        'quiz_id': quiz.id,
                        'quiz_title': quiz.title,
                        'score': None,
                        'passed': False,
                        'total_questions': quiz.questions.count(),
                        'correct_answers': 0,
                        'passing_score': quiz.passing_score,
                        'completed_at': None,
                    })
            except LessonQuiz.DoesNotExist:
                # Aula não tem quiz
                pass

        # Calcular média
        average_score = (total_score / total_quizzes) if total_quizzes > 0 else 0
        
        # Determinar se passou (média >= 70% por padrão, ou pode ser configurável)
        passing_average = 70  # Pode ser configurável no futuro
        course_passed = average_score >= passing_average

        return Response({
            'course_id': course.id,
            'course_title': course.title,
            'quiz_results': quiz_results,
            'total_quizzes': total_quizzes,
            'completed_quizzes': len([r for r in quiz_results if r['score'] is not None]),
            'average_score': round(average_score, 2),
            'passing_average': passing_average,
            'course_passed': course_passed,
            'enrollment_status': enrollment.status,
        })

    @action(detail=True, methods=['post'], url_path='retake-course')
    def retake_course(self, request, pk=None):
        """Permitir refazer o curso (resetar progresso e resultados de quiz)"""
        enrollment = self.get_object()
        course = enrollment.course
        user = request.user

        # Resetar progresso das aulas
        Progress.objects.filter(user=user, lesson__course=course).delete()
        
        # Resetar resultados de quiz
        lessons = course.lessons.all()
        for lesson in lessons:
            try:
                quiz = LessonQuiz.objects.get(lesson=lesson)
                QuizResult.objects.filter(user=user, quiz=quiz).delete()
                UserQuizAnswer.objects.filter(user=user, quiz=quiz).delete()
            except LessonQuiz.DoesNotExist:
                pass

        # Resetar resultado do exame final se existir
        try:
            final_exam = getattr(course, 'final_exam', None)
            if final_exam:
                ExamResult.objects.filter(user=user, exam=final_exam).delete()
                UserExamAnswer.objects.filter(user=user, exam=final_exam).delete()
        except Exception:
            pass

        return Response({
            'message': 'Curso resetado com sucesso. Você pode começar novamente.',
            'course_id': course.id,
        })

    @action(detail=True, methods=['get'], url_path='certificate-info')
    def certificate_info(self, request, pk=None):
        """Check if user is eligible for a course certificate and return data for it."""
        from courses.assessment import completion_status, issue_certificate as issue_if_eligible
        from .serializers import CertificateSerializer
        enrollment = self.get_object()
        if enrollment.status != 'active':
            return Response({
                'eligible': False,
                'message': 'Inscrição não está ativa.',
            }, status=status.HTTP_200_OK)
        progress = completion_status(enrollment)
        eligible = progress['completed'] and enrollment.course.offers_certificate
        cert = None
        if eligible:
            cert = issue_if_eligible(enrollment)
        return Response({
            'eligible': eligible,
            'course_id': enrollment.course.id,
            'course_title': enrollment.course.title,
            'user_name': getattr(request.user, 'get_full_name', lambda: '')() or request.user.email,
            'completed_at': cert.issued_at.isoformat() if cert else None,
            'certificate': CertificateSerializer(cert).data if cert else None,
            'progress': progress,
            'message': None if eligible else 'Conclua as aulas, quizzes e exame exigidos para obter o certificado.',
        }, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        """Criar enrollment (inscrição)"""
        course_id = request.data.get('course_id')
        course = get_object_or_404(Course, id=course_id, is_active=True)

        initial_status = 'active' if (course.is_free or course.price == 0) else 'pending'
        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course=course,
            defaults={'status': initial_status}
        )

        if not created:
            return Response(
                {'error': 'Já está inscrito neste curso.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        referral_code = request.data.get('referral_code') or request.query_params.get('ref')
        if referral_code:
            enrollment.referral_code = referral_code
            enrollment.save()

        if enrollment.status == 'active':
            from courses.commerce import activate_enrollment
            activate_enrollment(enrollment, payment_method='free')

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

        from subscriptions.billing import is_angola_user
        if not is_angola_user(request.user):
            return Response(
                {'detail': 'International users pay by card (iKhokha). Proof of payment is only for Angola.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES.get('file')
        notes = request.data.get('notes', '')

        if not file:
            return Response(
                {'error': 'Ficheiro é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if payment proof already exists
        if hasattr(enrollment, 'payment_proof'):
            existing_proof = enrollment.payment_proof
            # Allow re-upload only if previous proof was rejected
            if existing_proof.status == 'rejected':
                # Update existing proof
                existing_proof.file = file
                existing_proof.notes = notes
                existing_proof.status = 'pending'
                existing_proof.reviewed_by = None
                existing_proof.reviewed_at = None
                existing_proof.save()
                serializer = PaymentProofSerializer(existing_proof)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # Already has a pending or approved proof
                return Response(
                    {'error': 'Já existe um comprovativo para esta inscrição.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create new payment proof
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


# Quiz and Exam Views for Students
class LessonQuizViewSet(viewsets.ReadOnlyModelViewSet):
    """Visualização de quizzes de aulas para alunos"""
    serializer_class = LessonQuizSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        """Garantir que o contexto da request está disponível"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        # Alunos só veem quizzes de aulas que têm acesso
        user = self.request.user
        lessons_with_access = Lesson.objects.filter(
            Q(is_free=True) |
            Q(course__enrollments__user=user, course__enrollments__status='active')
        ).distinct()
        return LessonQuiz.objects.filter(lesson__in=lessons_with_access, is_active=True)

    @action(detail=False, methods=['get'], url_path='by-lesson/(?P<lesson_id>[^/.]+)')
    def by_lesson(self, request, lesson_id=None):
        """Buscar quiz de uma lição específica"""
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            user = request.user
            
            # Verificar acesso
            has_access = lesson.is_free
            if not has_access:
                has_access = Enrollment.objects.filter(
                    user=user, course=lesson.course, status='active'
                ).exists()
            
            if not has_access:
                return Response(
                    {'error': 'Não tem acesso a esta aula.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            try:
                quiz = LessonQuiz.objects.get(lesson=lesson, is_active=True)
                # Prefetch related para otimizar queries e garantir que choices sejam carregadas
                quiz = LessonQuiz.objects.prefetch_related(
                    'questions__question__choices'
                ).get(id=quiz.id)
                
                # Verificar se já existe resultado anterior
                previous_result = QuizResult.objects.filter(user=user, quiz=quiz).first()
                
                # Usar get_serializer para garantir que o contexto seja passado
                serializer = self.get_serializer(quiz, context={
                    'request': request,
                    'randomize_answers': quiz.randomize_answers,
                })
                data = serializer.data
                
                previous_results = QuizResult.objects.filter(user=user, quiz=quiz).order_by('-attempt_number')
                previous_result = previous_results.first()
                attempts_used = previous_results.count()
                if previous_result:
                    data['previous_result'] = {
                        'score': float(previous_result.score),
                        'passed': previous_result.passed,
                        'correct_answers': previous_result.correct_answers,
                        'total_questions': previous_result.total_questions,
                        'earned_points': float(previous_result.earned_points or 0),
                        'maximum_points': float(previous_result.maximum_points or 0),
                        'completed_at': previous_result.completed_at.isoformat() if previous_result.completed_at else None,
                    }
                data['attempts_used'] = attempts_used
                data['attempts_allowed'] = quiz.max_attempts or 0
                data['can_retry'] = quiz.max_attempts == 0 or attempts_used < quiz.max_attempts
                from courses.models import QuizAttemptDraft
                draft = QuizAttemptDraft.objects.filter(user=user, quiz=quiz).first()
                data['draft_answers'] = draft.answers if draft else []
                
                return Response(data)
            except LessonQuiz.DoesNotExist:
                # Verificar se existe quiz inativo para debug
                inactive_quiz = LessonQuiz.objects.filter(lesson=lesson, is_active=False).first()
                debug_info = {
                    'message': 'Nenhum quiz ativo encontrado para esta aula',
                    'lesson_id': lesson.id,
                    'lesson_title': lesson.title,
                    'has_inactive_quiz': inactive_quiz is not None,
                    'inactive_quiz_id': inactive_quiz.id if inactive_quiz else None
                }
                return Response({'quiz': None, 'debug': debug_info})
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Aula não encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='save-progress')
    def save_progress(self, request, pk=None):
        quiz = self.get_object()
        user = request.user
        if not (quiz.lesson.is_free or
                Enrollment.objects.filter(user=user, course=quiz.lesson.course, status='active').exists()):
            return Response({'error': 'no_access'}, status=status.HTTP_403_FORBIDDEN)
        from courses.models import QuizAttemptDraft
        answers = request.data.get('answers', [])
        if not isinstance(answers, list):
            answers = []
        draft, _ = QuizAttemptDraft.objects.update_or_create(
            user=user, quiz=quiz, defaults={'answers': answers}
        )
        return Response({'saved': True, 'updated_at': draft.updated_at})

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_quiz(self, request, pk=None):
        """Submeter respostas do quiz — score is computed server-side."""
        from courses.assessment import AttemptLimitError, submit_quiz_attempt
        from courses.models import QuizAttemptDraft

        quiz = self.get_object()
        user = request.user

        if not (quiz.lesson.is_free or
                Enrollment.objects.filter(user=user, course=quiz.lesson.course, status='active').exists()):
            return Response(
                {'error': 'Não tem acesso a este quiz.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.data.get('score') is not None or request.data.get('passed') is not None:
            return Response({'error': 'client_score_rejected'}, status=status.HTTP_400_BAD_REQUEST)

        answers_data = request.data.get('answers', [])
        try:
            result, breakdown = submit_quiz_attempt(user, quiz, answers_data)
        except AttemptLimitError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        QuizAttemptDraft.objects.filter(user=user, quiz=quiz).delete()
        serializer = QuizResultSerializer(result)
        payload = serializer.data
        payload['percentage'] = float(result.score)
        payload['earned_points'] = float(result.earned_points)
        payload['maximum_points'] = float(result.maximum_points)
        payload['attempts_used'] = result.attempt_number
        payload['attempts_allowed'] = quiz.max_attempts or 0
        payload['can_retry'] = (not result.passed) and (
            quiz.max_attempts == 0 or result.attempt_number < quiz.max_attempts
        )
        if quiz.show_correct_after or quiz.show_explanations:
            payload['question_results'] = breakdown
        return Response(payload, status=status.HTTP_201_CREATED)


class FinalExamViewSet(viewsets.ReadOnlyModelViewSet):
    """Visualização de exames finais para alunos"""
    serializer_class = FinalExamSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        """Garantir que o contexto da request está disponível"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        # Alunos só veem exames de cursos que têm acesso
        user = self.request.user
        courses_with_access = Course.objects.filter(
            enrollments__user=user,
            enrollments__status='active'
        ).distinct()
        return FinalExam.objects.filter(course__in=courses_with_access, is_active=True)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_exam(self, request, pk=None):
        """Submeter respostas do exame final — score is computed server-side."""
        from courses.assessment import AttemptLimitError, submit_exam_attempt

        exam = self.get_object()
        user = request.user

        if not Enrollment.objects.filter(user=user, course=exam.course, status='active').exists():
            return Response(
                {'error': 'Não tem acesso a este exame.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if request.data.get('score') is not None or request.data.get('passed') is not None:
            return Response({'error': 'client_score_rejected'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result, breakdown = submit_exam_attempt(user, exam, request.data.get('answers', []))
        except AttemptLimitError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        serializer = ExamResultSerializer(result)
        payload = serializer.data
        payload['percentage'] = float(result.score)
        payload['can_retry'] = (not result.passed) and result.attempt_number < exam.max_attempts
        if exam.show_correct_after or exam.show_explanations:
            payload['question_results'] = breakdown
        return Response(payload, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='my-results')
    def my_results(self, request, pk=None):
        """Ver resultados do aluno neste exame"""
        exam = self.get_object()
        user = request.user
        results = ExamResult.objects.filter(user=user, exam=exam).order_by('-completed_at')
        serializer = ExamResultSerializer(results, many=True)
        return Response(serializer.data)


def award_referral_points(enrollment):
    """Award points to referrer when enrollment is approved"""
    from decimal import Decimal
    from accounts.models import User
    
    # Check if points already awarded for this enrollment
    if ReferralPoints.objects.filter(enrollment=enrollment).exists():
        return None
    
    # First check course-specific referral code (from shared link)
    referrer = None
    if enrollment.referral_code:
        try:
            referrer = User.objects.get(referral_code=enrollment.referral_code)
        except User.DoesNotExist:
            pass
    
    # Fallback to user's general referrer (from registration)
    if not referrer:
        referrer = enrollment.user.referred_by
    
    if not referrer:
        return None
    
    # Create referral points record (1 point = 1000 KZ)
    referral_points = ReferralPoints.objects.create(
        referrer=referrer,
        referred_user=enrollment.user,
        enrollment=enrollment,
        points=Decimal('1.0'),
        status='pending'  # Admin needs to approve
    )
    
    # Update user's point balance
    current_balance = UserPoints.get_user_balance(referrer)
    new_balance = current_balance + Decimal('1.0')
    
    UserPoints.objects.create(
        user=referrer,
        transaction_type='earned',
        points=Decimal('1.0'),
        balance_after=new_balance,
        description=f'Pontos ganhos por referência: {enrollment.course.title}',
        referral_points=referral_points
    )
    
    return referral_points


class ReferralShareViewSet(viewsets.ModelViewSet):
    """Track course shares"""
    serializer_class = ReferralShareSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReferralShare.objects.filter(referrer=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(referrer=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='share-course')
    def share_course(self, request):
        """Record a course share"""
        course_id = request.data.get('course_id')
        platform = request.data.get('platform', '')
        
        if not course_id:
            return Response(
                {'error': 'course_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course = get_object_or_404(Course, id=course_id, is_active=True)
        
        share = ReferralShare.objects.create(
            referrer=request.user,
            course=course,
            platform=platform
        )
        
        serializer = ReferralShareSerializer(share)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReferralPointsViewSet(viewsets.ReadOnlyModelViewSet):
    """View referral points earned"""
    serializer_class = ReferralPointsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ReferralPoints.objects.filter(referrer=self.request.user)


class UserPointsViewSet(viewsets.ReadOnlyModelViewSet):
    """View user points balance and history"""
    serializer_class = UserPointsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserPoints.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='balance')
    def balance(self, request):
        """Get current points balance"""
        balance = UserPoints.get_user_balance(request.user)
        return Response({
            'balance': float(balance),
            'balance_kz': float(balance * 1000),  # 1 point = 1000 KZ
        })
    
    @action(detail=False, methods=['post'], url_path='redeem-course')
    def redeem_course(self, request):
        """Redeem points for a course enrollment (full or partial)"""
        from decimal import Decimal
        
        course_id = request.data.get('course_id')
        points_to_use = request.data.get('points_to_use', None)  # Optional: partial payment
        
        if not course_id:
            return Response(
                {'error': 'course_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        course = get_object_or_404(Course, id=course_id, is_active=True)
        course_price_kz = Decimal(str(course.price))
        points_equivalent = course_price_kz / Decimal('1000')  # Convert KZ to points
        
        current_balance = UserPoints.get_user_balance(request.user)
        
        # Determine how many points to use
        if points_to_use is not None:
            points_to_use_decimal = Decimal(str(points_to_use))
            if points_to_use_decimal > current_balance:
                return Response(
                    {'error': f'Pontos insuficientes. Tentou usar: {points_to_use_decimal}, Disponível: {current_balance}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if points_to_use_decimal > points_equivalent:
                return Response(
                    {'error': f'Não pode usar mais pontos do que o valor do curso. Curso: {points_equivalent} pts'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            points_used = points_to_use_decimal
            remaining_kz = (course_price_kz - (points_used * Decimal('1000')))
        else:
            # Full payment with points
            if current_balance < points_equivalent:
                return Response(
                    {'error': f'Pontos insuficientes. Necessário: {points_equivalent}, Disponível: {current_balance}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            points_used = points_equivalent
            remaining_kz = Decimal('0')
        
        # Check if already enrolled
        enrollment, created = Enrollment.objects.get_or_create(
            user=request.user,
            course=course,
            defaults={'status': 'active' if remaining_kz == 0 else 'pending', 'activated_at': timezone.now() if remaining_kz == 0 else None}
        )
        
        if not created:
            return Response(
                {'error': 'Já está inscrito neste curso.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Deduct points
        new_balance = current_balance - points_used
        UserPoints.objects.create(
            user=request.user,
            transaction_type='spent',
            points=-points_used,
            balance_after=new_balance,
            description=f'Pontos gastos para curso: {course.title}' + (f' (parcial, restante: {remaining_kz} KZ)' if remaining_kz > 0 else '')
        )
        
        return Response({
            'message': 'Curso adquirido com pontos!' if remaining_kz == 0 else f'Pontos aplicados! Resta pagar {remaining_kz} KZ e enviar comprovativo.',
            'enrollment': EnrollmentSerializer(enrollment).data,
            'points_used': float(points_used),
            'remaining_kz': float(remaining_kz),
            'remaining_balance': float(new_balance)
        })
    
    @action(detail=False, methods=['post'], url_path='redeem-subscription')
    def redeem_subscription(self, request):
        """Redeem points for app subscription (full or partial)"""
        from decimal import Decimal
        
        from django.conf import settings
        subscription_price_kz = Decimal(str(getattr(settings, 'SUBSCRIPTION_MONTHLY_PRICE_KZ', 10000)))
        points_equivalent = subscription_price_kz / Decimal('1000')
        points_to_use = request.data.get('points_to_use', None)  # Optional: partial payment
        
        current_balance = UserPoints.get_user_balance(request.user)
        
        # Determine how many points to use
        if points_to_use is not None:
            points_to_use_decimal = Decimal(str(points_to_use))
            if points_to_use_decimal > current_balance:
                return Response(
                    {'error': f'Pontos insuficientes. Tentou usar: {points_to_use_decimal}, Disponível: {current_balance}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if points_to_use_decimal > points_equivalent:
                return Response(
                    {'error': f'Não pode usar mais pontos do que o valor da subscrição. Subscrição: {points_equivalent} pts'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            points_used = points_to_use_decimal
            remaining_kz = subscription_price_kz - (points_used * Decimal('1000'))
        else:
            # Full payment with points
            if current_balance < points_equivalent:
                return Response(
                    {'error': f'Pontos insuficientes. Necessário: {points_equivalent}, Disponível: {current_balance}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            points_used = points_equivalent
            remaining_kz = Decimal('0')
        
        # Try to import subscription model
        try:
            from subscriptions.models import MobileAppSubscription
            subscription, created = MobileAppSubscription.objects.get_or_create(
                user=request.user,
                defaults={'status': 'active' if remaining_kz == 0 else 'trial'}
            )
            
            if not created:
                if subscription.status == 'active' and remaining_kz == 0:
                    return Response(
                        {'error': 'Já tem uma subscrição ativa.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                # If partial payment, keep as trial/pending until full payment
                if remaining_kz > 0:
                    subscription.status = 'trial'  # Will need payment proof
                else:
                    subscription.status = 'active'
                subscription.save()
        except ImportError:
            return Response(
                {'error': 'Sistema de subscrições não disponível.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Deduct points
        new_balance = current_balance - points_used
        UserPoints.objects.create(
            user=request.user,
            transaction_type='spent',
            points=-points_used,
            balance_after=new_balance,
            description='Pontos gastos para subscrição do app' + (f' (parcial, restante: {remaining_kz} KZ)' if remaining_kz > 0 else '')
        )
        
        return Response({
            'message': 'Subscrição ativada com pontos!' if remaining_kz == 0 else f'Pontos aplicados! Resta pagar {remaining_kz} KZ e enviar comprovativo.',
            'points_used': float(points_used),
            'remaining_kz': float(remaining_kz),
            'remaining_balance': float(new_balance)
        })


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        from .serializers import CategorySerializer
        return CategorySerializer

    def get_queryset(self):
        from .models import Category
        return Category.objects.filter(is_active=True, parent__isnull=True)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsStaffAdmin]

    def get_serializer_class(self):
        from .serializers import CategorySerializer
        return CategorySerializer

    def get_queryset(self):
        from .models import Category
        if not is_staff_admin(self.request.user):
            return Category.objects.none()
        return Category.objects.all()


class CourseReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CourseReviewSerializer
        return CourseReviewSerializer

    def get_queryset(self):
        from .models import CourseReview
        qs = CourseReview.objects.filter(status='published')
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if self.action in ('update', 'partial_update', 'destroy'):
            if obj.student_id != request.user.id and not is_staff_admin(request.user):
                self.permission_denied(request, message='not_owner')

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from .models import Progress
        from instructors.services import refresh_course_rating
        course = serializer.validated_data['course']
        enrolled = Enrollment.objects.filter(
            user=self.request.user, course=course, status='active'
        ).exists()
        if not enrolled:
            raise ValidationError({'detail': 'must_enroll'})
        total = course.lessons.count()
        done = Progress.objects.filter(
            user=self.request.user, lesson__course=course, completed=True
        ).count()
        if total and done < max(1, total // 4):
            raise ValidationError({'detail': 'need_progress'})
        serializer.save(student=self.request.user)
        refresh_course_rating(course)

    def perform_update(self, serializer):
        from instructors.services import refresh_course_rating
        serializer.save()
        refresh_course_rating(serializer.instance.course)

    def perform_destroy(self, instance):
        from instructors.services import refresh_course_rating
        course = instance.course
        instance.delete()
        refresh_course_rating(course)

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        from instructors.permissions import approved_instructor
        review = self.get_object()
        instructor = approved_instructor(request.user)
        if not is_staff_admin(request.user) and (
            instructor is None or review.course.instructor_id != instructor.id
        ):
            return Response({'detail': 'not_owner'}, status=status.HTTP_403_FORBIDDEN)
        review.instructor_reply = request.data.get('instructor_reply', '')
        review.replied_at = timezone.now()
        review.save(update_fields=['instructor_reply', 'replied_at'])
        from .serializers import CourseReviewSerializer
        return Response(CourseReviewSerializer(review).data)


class AdminCourseReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        from .serializers import CourseReviewSerializer
        return CourseReviewSerializer

    def get_queryset(self):
        from .models import CourseReview
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            return CourseReview.objects.none()
        return CourseReview.objects.all()

    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'detail': 'admin_required'}, status=status.HTTP_403_FORBIDDEN)
        review = self.get_object()
        review.status = 'hidden'
        review.save(update_fields=['status'])
        from instructors.services import refresh_course_rating
        refresh_course_rating(review.course)
        from .serializers import CourseReviewSerializer
        return Response(CourseReviewSerializer(review).data)


class CertificateViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        from .serializers import CertificateSerializer
        return CertificateSerializer

    def get_queryset(self):
        from .models import Certificate
        user = self.request.user
        if user.is_authenticated:
            return Certificate.objects.filter(student=user)
        return Certificate.objects.none()

    @action(detail=False, methods=['get'], url_path='verify/(?P<code>[^/.]+)', permission_classes=[AllowAny])
    def verify(self, request, code=None):
        from .models import Certificate
        from .serializers import CertificateSerializer
        from courses.assessment import CERT_REVOKED, CERT_EXPIRED, certificate_status
        cert = Certificate.objects.filter(public_id=code).first() or Certificate.objects.filter(code=code).first()
        if cert is None:
            return Response({'detail': 'not_found'}, status=status.HTTP_404_NOT_FOUND)
        data = CertificateSerializer(cert, context={'request': request}).data
        data['display_status'] = certificate_status(cert)
        if data['display_status'] == CERT_REVOKED:
            data['message'] = 'Certificate revoked.'
        elif data['display_status'] == CERT_EXPIRED:
            data['message'] = 'Certificate expired.'
        return Response(data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='revoke')
    def revoke(self, request):
        from .models import Certificate
        from courses.assessment import revoke_certificate
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'detail': 'admin_required'}, status=status.HTTP_403_FORBIDDEN)
        ident = request.data.get('code') or request.data.get('public_id')
        cert = Certificate.objects.filter(public_id=ident).first() or Certificate.objects.filter(code=ident).first()
        if cert is None:
            return Response({'detail': 'not_found'}, status=status.HTTP_404_NOT_FOUND)
        cert = revoke_certificate(cert, request.data.get('reason') or '')
        from .serializers import CertificateSerializer
        return Response(CertificateSerializer(cert, context={'request': request}).data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated], url_path='issue')
    def issue(self, request):
        from .commerce import issue_certificate
        enrollment_id = request.data.get('enrollment_id')
        enrollment = get_object_or_404(Enrollment, id=enrollment_id, user=request.user)
        cert = issue_certificate(enrollment)
        if cert is None:
            return Response({'detail': 'not_eligible'}, status=status.HTTP_400_BAD_REQUEST)
        from .serializers import CertificateSerializer
        return Response(CertificateSerializer(cert, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_learning(request):
    from .models import CourseReview, Certificate as Cert
    from .serializers import EnrollmentSerializer, CourseSerializer, CertificateSerializer
    from instructors.models import SavedItem
    from mentorship.models import MentorshipRequest, MentorshipSession
    from mentorship.serializers import MentorshipSessionSerializer
    enrollments = Enrollment.objects.filter(user=request.user).select_related('course')
    continue_qs = list(enrollments.filter(status='active')[:8])
    published = Course.objects.filter(status=Course.STATUS_PUBLISHED, is_active=True)
    enrolled_ids = enrollments.values_list('course_id', flat=True)
    recommended = published.exclude(id__in=enrolled_ids).order_by('-is_recommended', '-rating_avg')[:6]
    upcoming = MentorshipSession.objects.filter(
        student=request.user,
        status='scheduled',
        starts_at__gte=timezone.now(),
    ).order_by('starts_at')[:5]
    return Response({
        'enrollments': EnrollmentSerializer(enrollments, many=True, context={'request': request}).data,
        'continue_learning': EnrollmentSerializer(continue_qs, many=True, context={'request': request}).data,
        'certificates': CertificateSerializer(
            Cert.objects.filter(student=request.user), many=True, context={'request': request}
        ).data,
        'saved': list(SavedItem.objects.filter(user=request.user).values('id', 'kind', 'object_id', 'created_at')),
        'recommended': CourseSerializer(recommended, many=True, context={'request': request}).data,
        'upcoming_sessions': MentorshipSessionSerializer(upcoming, many=True).data,
        'mentorship_requests': list(
            MentorshipRequest.objects.filter(user=request.user).values('id', 'status', 'package_id', 'created_at')
        ),
        'reviews': list(
            CourseReview.objects.filter(student=request.user).values('id', 'course_id', 'rating', 'created_at')
        ),
    })
