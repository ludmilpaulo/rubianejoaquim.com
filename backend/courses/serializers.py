from rest_framework import serializers
from django.utils.text import slugify
from .models import (
    Course, Lesson, LessonAttachment, Enrollment, PaymentProof, Progress,
    Question, Choice, LessonQuiz, LessonQuizQuestion, FinalExam, FinalExamQuestion,
    UserQuizAnswer, UserExamAnswer, QuizResult, ExamResult,
    ReferralShare, ReferralPoints, UserPoints,
    Category, CourseModule, CourseReview, Certificate, Assignment, AssignmentSubmission,
)


class LessonAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = LessonAttachment
        fields = ['id', 'title', 'file', 'file_url', 'file_type', 'description', 'order', 'created_at']
        read_only_fields = ['file_url']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class LessonSerializer(serializers.ModelSerializer):
    attachments = LessonAttachmentSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    course = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'module', 'title', 'slug', 'description', 'video_url',
            'video_file', 'lesson_type', 'duration', 'content', 'is_free', 'order',
            'attachments', 'progress', 'locked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_course(self, obj):
        """Retorna informações básicas do curso"""
        return {
            'id': obj.course.id,
            'title': obj.course.title,
            'slug': obj.course.slug,
            'price': str(obj.course.price),
        }

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = Progress.objects.get(user=request.user, lesson=obj)
                return {
                    'completed': progress.completed,
                    'completed_at': progress.completed_at
                }
            except Progress.DoesNotExist:
                return {'completed': False, 'completed_at': None}
        return None

    def _can_access(self, obj):
        if obj.is_free:
            return True
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        if user.is_staff or user.is_superuser:
            return True
        instructor = getattr(user, 'instructor_profile', None)
        if instructor and obj.course.instructor_id == instructor.id:
            return True
        return Enrollment.objects.filter(
            user=user, course=obj.course, status='active'
        ).exists()

    def get_locked(self, obj):
        return not self._can_access(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('locked'):
            data['content'] = ''
            data['video_url'] = ''
            data['video_file'] = None
            data['attachments'] = []
        return data


class AdminLessonSerializer(serializers.ModelSerializer):
    """Serializer para admin com attachments writable"""
    attachments = LessonAttachmentSerializer(many=True, read_only=True)
    attachments_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="Lista de attachments para criar/atualizar"
    )

    class Meta:
        model = Lesson
        fields = [
            'id', 'course', 'module', 'title', 'slug', 'description', 'video_url',
            'video_file', 'lesson_type', 'duration', 'content', 'is_free', 'order',
            'attachments', 'attachments_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_slug(self, value):
        """Valida e normaliza o slug"""
        if not value:
            return value
        # Garantir que o slug contém apenas letras, números, hífens e underscores
        normalized = slugify(value)
        if not normalized:
            raise serializers.ValidationError("Não foi possível gerar um slug válido a partir do título.")
        return normalized

    def validate(self, attrs):
        """Gera slug automaticamente se não fornecido"""
        if not attrs.get('slug') and attrs.get('title'):
            attrs['slug'] = slugify(attrs['title'])
        return attrs

    def create(self, validated_data):
        attachments_data = validated_data.pop('attachments_data', [])
        lesson = Lesson.objects.create(**validated_data)
        
        # Criar attachments se fornecidos
        for att_data in attachments_data:
            LessonAttachment.objects.create(lesson=lesson, **att_data)
        
        return lesson

    def update(self, instance, validated_data):
        attachments_data = validated_data.pop('attachments_data', None)
        
        # Atualizar campos da lesson
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Se attachments_data for fornecido, atualizar attachments
        if attachments_data is not None:
            # Remover attachments existentes (ou manter e atualizar - depende da lógica)
            # Por enquanto, vamos apenas criar novos se fornecidos
            for att_data in attachments_data:
                att_id = att_data.pop('id', None)
                if att_id:
                    # Atualizar attachment existente
                    try:
                        attachment = LessonAttachment.objects.get(id=att_id, lesson=instance)
                        for attr, value in att_data.items():
                            setattr(attachment, attr, value)
                        attachment.save()
                    except LessonAttachment.DoesNotExist:
                        pass
                else:
                    # Criar novo attachment
                    LessonAttachment.objects.create(lesson=instance, **att_data)
        
        return instance


class CourseSerializer(serializers.ModelSerializer):
    lessons_count = serializers.SerializerMethodField()
    free_lessons_count = serializers.SerializerMethodField()
    enrollment_status = serializers.SerializerMethodField()
    instructor = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'short_description',
            'price', 'currency', 'image', 'is_active', 'is_free', 'kind', 'status',
            'language', 'level', 'category', 'category_name', 'instructor',
            'trailer_url', 'learning_objectives', 'requirements', 'target_audience',
            'is_featured', 'is_popular', 'is_new', 'is_recommended',
            'offers_certificate', 'rating_avg', 'rating_count',
            'lessons_count', 'free_lessons_count', 'duration_minutes',
            'enrollment_status', 'rejection_reason', 'created_at'
        ]

    def validate_slug(self, value):
        """Valida e normaliza o slug"""
        if not value:
            return value
        # Garantir que o slug contém apenas letras, números, hífens e underscores
        normalized = slugify(value)
        if not normalized:
            raise serializers.ValidationError("Não foi possível gerar um slug válido a partir do título.")
        return normalized

    def get_lessons_count(self, obj):
        return obj.lessons.count()

    def get_free_lessons_count(self, obj):
        return obj.lessons.filter(is_free=True).count()

    def get_duration_minutes(self, obj):
        from django.db.models import Sum
        return obj.lessons.aggregate(s=Sum('duration'))['s'] or 0

    def get_category_name(self, obj):
        return obj.category.name if obj.category_id else None

    def get_instructor(self, obj):
        if not obj.instructor_id:
            return None
        inst = obj.instructor
        return {
            'id': inst.id,
            'slug': inst.slug,
            'display_name': inst.display_name,
            'headline': inst.headline,
            'rating_avg': str(inst.rating_avg),
            'is_official': inst.is_official,
        }

    def get_enrollment_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                enrollment = Enrollment.objects.get(user=request.user, course=obj)
                return {
                    'status': enrollment.status,
                    'enrolled_at': enrollment.enrolled_at,
                    'activated_at': enrollment.activated_at
                }
            except Enrollment.DoesNotExist:
                return None
        return None


class CourseDetailSerializer(CourseSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    modules = serializers.SerializerMethodField()
    reviews_preview = serializers.SerializerMethodField()

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['lessons', 'modules', 'reviews_preview']

    def get_modules(self, obj):
        return CourseModuleSerializer(obj.modules.all(), many=True, context=self.context).data

    def get_reviews_preview(self, obj):
        qs = obj.reviews.filter(status='published').order_by('-created_at')[:8]
        return CourseReviewSerializer(qs, many=True).data


class CourseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'short_description', 'price',
            'currency', 'image', 'is_active', 'is_free', 'kind', 'language', 'level',
            'category', 'trailer_url', 'learning_objectives', 'requirements',
            'target_audience', 'offers_certificate', 'status',
        ]
        read_only_fields = ['status']

    def validate_slug(self, value):
        if not value:
            return value
        return slugify(value)


class CourseModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = CourseModule
        fields = ['id', 'course', 'title', 'description', 'order', 'lessons']


class CategorySerializer(serializers.ModelSerializer):
    localized_name = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'parent', 'slug', 'name', 'name_i18n', 'icon', 'order', 'is_active', 'localized_name', 'children']

    def get_localized_name(self, obj):
        request = self.context.get('request')
        lang = request.query_params.get('lang') if request else None
        return obj.localized_name(lang)

    def get_children(self, obj):
        kids = obj.children.filter(is_active=True)
        return CategorySerializer(kids, many=True, context=self.context).data


class CourseReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseReview
        fields = [
            'id', 'course', 'rating', 'body', 'instructor_reply', 'replied_at',
            'status', 'student_name', 'created_at',
        ]
        read_only_fields = ['instructor_reply', 'replied_at', 'status', 'created_at']

    def get_student_name(self, obj):
        return obj.student.get_full_name() or obj.student.email.split('@')[0]


class CertificateSerializer(serializers.ModelSerializer):
    verify_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            'id', 'code', 'student_name', 'course_title', 'instructor_name',
            'issued_at', 'verify_url', 'course', 'enrollment',
        ]

    def get_verify_url(self, obj):
        from django.conf import settings
        base = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com')
        return f'{base}/certificado/verify/{obj.code}'


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    user = serializers.SerializerMethodField()
    payment_proof = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ['id', 'user', 'course', 'status', 'enrolled_at', 'activated_at', 'payment_proof', 'progress']

    def get_user(self, obj):
        from accounts.serializers import UserSerializer
        return UserSerializer(obj.user).data

    def get_payment_proof(self, obj):
        try:
            proof = obj.payment_proof
            return {
                'id': proof.id,
                'status': proof.status,
                'created_at': proof.created_at,
                'reviewed_at': proof.reviewed_at
            }
        except PaymentProof.DoesNotExist:
            return None

    def get_progress(self, obj):
        """Calcula o progresso do curso"""
        if obj.status != 'active':
            return None
        
        user = obj.user
        course = obj.course
        total_lessons = course.lessons.count()
        
        if total_lessons == 0:
            return {
                'completed_lessons': 0,
                'total_lessons': 0,
                'percentage': 0
            }
        
        completed_lessons = Progress.objects.filter(
            user=user,
            lesson__course=course,
            completed=True
        ).count()
        
        percentage = round((completed_lessons / total_lessons) * 100, 1)
        
        return {
            'completed_lessons': completed_lessons,
            'total_lessons': total_lessons,
            'percentage': percentage
        }


class PaymentProofSerializer(serializers.ModelSerializer):
    enrollment = EnrollmentSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentProof
        fields = ['id', 'enrollment', 'file', 'file_url', 'notes', 'status', 'created_at', 'reviewed_at', 'reviewed_by']
        read_only_fields = ['status', 'reviewed_at', 'reviewed_by', 'file_url']

    def get_file_url(self, obj):
        """Retorna a URL completa do arquivo"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ProgressSerializer(serializers.ModelSerializer):
    lesson = LessonSerializer(read_only=True)

    class Meta:
        model = Progress
        fields = ['id', 'lesson', 'completed', 'completed_at', 'updated_at']


# Quiz Serializers
class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'question', 'choice_text', 'is_correct', 'order']

    def to_representation(self, instance):
        """Esconder is_correct para alunos (não-admin)"""
        representation = super().to_representation(instance)
        request = self.context.get('request')
        # Só esconder se não for admin e se request existir
        if request and hasattr(request, 'user'):
            if not (request.user.is_staff or request.user.is_superuser):
                representation.pop('is_correct', None)
        return representation


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)
    course_id = serializers.IntegerField(source='course.id', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    lesson_id = serializers.IntegerField(source='lesson.id', read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'course', 'course_id', 'course_title', 'lesson', 'lesson_id', 'lesson_title', 'question_text', 'explanation', 'choices', 'order', 'created_at', 'updated_at']


class LessonQuizQuestionSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    question_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = LessonQuizQuestion
        fields = ['id', 'question', 'question_id', 'points', 'order']


class LessonQuizSerializer(serializers.ModelSerializer):
    questions = LessonQuizQuestionSerializer(many=True, read_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = LessonQuiz
        fields = [
            'id', 'lesson', 'lesson_title', 'title', 'description',
            'passing_score', 'time_limit_minutes', 'is_active',
            'questions', 'created_at', 'updated_at'
        ]


class FinalExamQuestionSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)
    question_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = FinalExamQuestion
        fields = ['id', 'question', 'question_id', 'points', 'order']


class FinalExamSerializer(serializers.ModelSerializer):
    questions = FinalExamQuestionSerializer(many=True, read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model = FinalExam
        fields = [
            'id', 'course', 'course_title', 'title', 'description',
            'passing_score', 'time_limit_minutes', 'max_attempts', 'is_active',
            'questions', 'created_at', 'updated_at'
        ]


class UserQuizAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    selected_choice_text = serializers.CharField(source='selected_choice.choice_text', read_only=True)

    class Meta:
        model = UserQuizAnswer
        fields = ['id', 'question', 'question_text', 'selected_choice', 'selected_choice_text', 'is_correct', 'answered_at']


class UserExamAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question_text', read_only=True)
    selected_choice_text = serializers.CharField(source='selected_choice.choice_text', read_only=True)

    class Meta:
        model = UserExamAnswer
        fields = ['id', 'question', 'question_text', 'selected_choice', 'selected_choice_text', 'is_correct', 'answered_at']


class QuizResultSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    lesson_title = serializers.CharField(source='quiz.lesson.title', read_only=True)

    class Meta:
        model = QuizResult
        fields = [
            'id', 'quiz', 'quiz_title', 'lesson_title', 'score',
            'total_questions', 'correct_answers', 'passed',
            'started_at', 'completed_at'
        ]


class ExamResultSerializer(serializers.ModelSerializer):
    exam_title = serializers.CharField(source='exam.title', read_only=True)
    course_title = serializers.CharField(source='exam.course.title', read_only=True)

    class Meta:
        model = ExamResult
        fields = [
            'id', 'exam', 'exam_title', 'course_title', 'attempt_number',
            'score', 'total_questions', 'correct_answers', 'passed',
            'started_at', 'completed_at'
        ]


class ReferralShareSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    referrer_email = serializers.CharField(source='referrer.email', read_only=True)
    
    class Meta:
        model = ReferralShare
        fields = ['id', 'referrer', 'referrer_email', 'course', 'course_title', 'platform', 'shared_at']
        read_only_fields = ['referrer', 'shared_at']


class ReferralPointsSerializer(serializers.ModelSerializer):
    referrer_email = serializers.CharField(source='referrer.email', read_only=True)
    referred_user_email = serializers.CharField(source='referred_user.email', read_only=True)
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)
    
    class Meta:
        model = ReferralPoints
        fields = [
            'id', 'referrer', 'referrer_email', 'referred_user', 'referred_user_email',
            'enrollment', 'course_title', 'points', 'status', 'created_at',
            'approved_at', 'approved_by'
        ]
        read_only_fields = ['created_at', 'approved_at', 'approved_by']


class UserPointsSerializer(serializers.ModelSerializer):
    course_title = serializers.SerializerMethodField()
    
    class Meta:
        model = UserPoints
        fields = [
            'id', 'transaction_type', 'points', 'balance_after', 'description',
            'referral_points', 'course_title', 'created_at'
        ]
        read_only_fields = ['created_at', 'balance_after']
    
    def get_course_title(self, obj):
        if obj.referral_points and obj.referral_points.enrollment:
            return obj.referral_points.enrollment.course.title
        return None


class AdminUserPointsSerializer(serializers.ModelSerializer):
    """Admin list: include user info for each transaction."""
    course_title = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = UserPoints
        fields = [
            'id', 'user_id', 'user_email', 'transaction_type', 'points', 'balance_after',
            'description', 'referral_points', 'course_title', 'created_at'
        ]
        read_only_fields = ['created_at', 'balance_after']
    
    def get_course_title(self, obj):
        if obj.referral_points and obj.referral_points.enrollment:
            return obj.referral_points.enrollment.course.title
        return None
