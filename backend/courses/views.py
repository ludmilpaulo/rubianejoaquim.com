from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import (
    Course, Lesson, Enrollment, PaymentProof, Progress,
    LessonQuiz, FinalExam, Question, Choice,
    UserQuizAnswer, UserExamAnswer, QuizResult, ExamResult,
    LessonQuizQuestion, FinalExamQuestion
)
from .serializers import (
    CourseSerializer, CourseDetailSerializer, LessonSerializer,
    EnrollmentSerializer, PaymentProofSerializer, ProgressSerializer,
    LessonQuizSerializer, FinalExamSerializer, QuestionSerializer,
    UserQuizAnswerSerializer, UserExamAnswerSerializer,
    QuizResultSerializer, ExamResultSerializer
)
from django.utils import timezone


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
            final_exam = course.final_exam
            if final_exam:
                ExamResult.objects.filter(user=user, exam=final_exam).delete()
                UserExamAnswer.objects.filter(user=user, exam=final_exam).delete()
        except FinalExam.DoesNotExist:
            pass

        return Response({
            'message': 'Curso resetado com sucesso. Você pode começar novamente.',
            'course_id': course.id,
        })

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
                serializer = self.get_serializer(quiz, context={'request': request})
                data = serializer.data
                
                # Adicionar informações do resultado anterior se existir
                if previous_result:
                    data['previous_result'] = {
                        'score': float(previous_result.score),
                        'passed': previous_result.passed,
                        'correct_answers': previous_result.correct_answers,
                        'total_questions': previous_result.total_questions,
                        'completed_at': previous_result.completed_at.isoformat() if previous_result.completed_at else None,
                    }
                
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

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_quiz(self, request, pk=None):
        """Submeter respostas do quiz"""
        quiz = self.get_object()
        user = request.user

        # Verificar acesso
        if not (quiz.lesson.is_free or 
                Enrollment.objects.filter(user=user, course=quiz.lesson.course, status='active').exists()):
            return Response(
                {'error': 'Não tem acesso a este quiz.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Se já existe resultado anterior, deletar para permitir refazer
        existing_result = QuizResult.objects.filter(user=user, quiz=quiz).first()
        if existing_result:
            # Deletar respostas anteriores e resultado anterior
            UserQuizAnswer.objects.filter(user=user, quiz=quiz).delete()
            existing_result.delete()

        answers_data = request.data.get('answers', [])  # Lista de {question_id, choice_id}

        # Salvar respostas
        total_questions = quiz.questions.count()
        correct_answers = 0

        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            choice_id = answer_data.get('choice_id')

            try:
                question = Question.objects.get(id=question_id)
                choice = Choice.objects.get(id=choice_id, question=question)
                
                # Verificar se a pergunta pertence ao quiz
                if not quiz.questions.filter(question=question).exists():
                    continue

                is_correct = choice.is_correct
                if is_correct:
                    correct_answers += 1

                UserQuizAnswer.objects.create(
                    user=user,
                    quiz=quiz,
                    question=question,
                    selected_choice=choice,
                    is_correct=is_correct
                )
            except (Question.DoesNotExist, Choice.DoesNotExist):
                continue

        # Calcular pontuação
        total_points = sum(qq.points for qq in quiz.questions.all())
        user_answers = UserQuizAnswer.objects.filter(user=user, quiz=quiz)
        earned_points = 0
        for answer in user_answers:
            if answer.is_correct:
                try:
                    qq = quiz.questions.get(question=answer.question)
                    earned_points += qq.points
                except LessonQuizQuestion.DoesNotExist:
                    pass
        score = (earned_points / total_points * 100) if total_points > 0 else 0
        passed = score >= quiz.passing_score

        # Criar resultado
        result = QuizResult.objects.create(
            user=user,
            quiz=quiz,
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            passed=passed,
            completed_at=timezone.now()
        )

        serializer = QuizResultSerializer(result)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        """Submeter respostas do exame final"""
        exam = self.get_object()
        user = request.user

        # Verificar acesso
        if not Enrollment.objects.filter(user=user, course=exam.course, status='active').exists():
            return Response(
                {'error': 'Não tem acesso a este exame.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar número de tentativas
        existing_results = ExamResult.objects.filter(user=user, exam=exam)
        attempt_number = existing_results.count() + 1

        if attempt_number > exam.max_attempts:
            return Response(
                {'error': f'Número máximo de tentativas ({exam.max_attempts}) excedido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        answers_data = request.data.get('answers', [])

        # Limpar respostas anteriores desta tentativa (se houver)
        # Na prática, cada tentativa cria um novo ExamResult

        # Salvar respostas
        total_questions = exam.questions.count()
        correct_answers = 0

        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            choice_id = answer_data.get('choice_id')

            try:
                question = Question.objects.get(id=question_id)
                choice = Choice.objects.get(id=choice_id, question=question)
                
                # Verificar se a pergunta pertence ao exame
                if not exam.questions.filter(question=question).exists():
                    continue

                is_correct = choice.is_correct
                if is_correct:
                    correct_answers += 1

                UserExamAnswer.objects.create(
                    user=user,
                    exam=exam,
                    question=question,
                    selected_choice=choice,
                    is_correct=is_correct
                )
            except (Question.DoesNotExist, Choice.DoesNotExist):
                continue

        # Calcular pontuação
        total_points = sum(eq.points for eq in exam.questions.all())
        user_answers = UserExamAnswer.objects.filter(user=user, exam=exam)
        earned_points = 0
        for answer in user_answers:
            if answer.is_correct:
                try:
                    eq = exam.questions.get(question=answer.question)
                    earned_points += eq.points
                except FinalExamQuestion.DoesNotExist:
                    pass
        score = (earned_points / total_points * 100) if total_points > 0 else 0
        passed = score >= exam.passing_score

        # Criar resultado
        result = ExamResult.objects.create(
            user=user,
            exam=exam,
            attempt_number=attempt_number,
            score=score,
            total_questions=total_questions,
            correct_answers=correct_answers,
            passed=passed,
            completed_at=timezone.now()
        )

        serializer = ExamResultSerializer(result)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='my-results')
    def my_results(self, request, pk=None):
        """Ver resultados do aluno neste exame"""
        exam = self.get_object()
        user = request.user
        results = ExamResult.objects.filter(user=user, exam=exam).order_by('-completed_at')
        serializer = ExamResultSerializer(results, many=True)
        return Response(serializer.data)
