from django.db import models
from django.conf import settings
from django.utils.text import slugify

from config.locales import SUPPORTED_LOCALES


class Category(models.Model):
    """Admin-managed education taxonomy (Finance, Technology, Business, Education, …)."""

    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
    )
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=120)
    name_i18n = models.JSONField(default=dict, blank=True, help_text='Optional {pt,en,fr,es} labels')
    icon = models.CharField(max_length=40, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

    def localized_name(self, locale: str | None = None) -> str:
        code = (locale or 'pt').split('-')[0]
        if isinstance(self.name_i18n, dict):
            return self.name_i18n.get(code) or self.name_i18n.get('pt') or self.name
        return self.name


class Course(models.Model):
    """Modelo de Curso — marketplace-owned by an instructor."""

    KIND_COURSE = 'course'
    KIND_TUTORIAL = 'tutorial'
    KIND_CHOICES = [
        (KIND_COURSE, 'Course'),
        (KIND_TUTORIAL, 'Tutorial'),
    ]

    STATUS_DRAFT = 'draft'
    STATUS_PENDING = 'pending_review'
    STATUS_APPROVED = 'approved'
    STATUS_PUBLISHED = 'published'
    STATUS_REJECTED = 'rejected'
    STATUS_UNPUBLISHED = 'unpublished'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PENDING, 'Pending review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_UNPUBLISHED, 'Unpublished'),
    ]

    LEVEL_BEGINNER = 'beginner'
    LEVEL_INTERMEDIATE = 'intermediate'
    LEVEL_ADVANCED = 'advanced'
    LEVEL_ALL = 'all'
    LEVEL_CHOICES = [
        (LEVEL_BEGINNER, 'Beginner'),
        (LEVEL_INTERMEDIATE, 'Intermediate'),
        (LEVEL_ADVANCED, 'Advanced'),
        (LEVEL_ALL, 'All levels'),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='courses/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    order = models.IntegerField(default=0, help_text="Ordem de exibição")

    instructor = models.ForeignKey(
        'instructors.InstructorProfile',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='courses',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='courses',
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default=KIND_COURSE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    language = models.CharField(
        max_length=5,
        default='pt',
        help_text='Instructor content language (pt/en/fr/es). Not machine-translated.',
    )
    translations = models.JSONField(
        default=dict,
        blank=True,
        help_text='Optional explicit translations: {en: {title, description, ...}}',
    )
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default=LEVEL_BEGINNER)
    currency = models.CharField(max_length=3, default='USD')
    is_free = models.BooleanField(default=False)
    trailer_url = models.URLField(blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)
    requirements = models.JSONField(default=list, blank=True)
    target_audience = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    is_featured = models.BooleanField(default=False)
    is_popular = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_recommended = models.BooleanField(default=False)
    offers_certificate = models.BooleanField(default=True)
    certificate_title = models.CharField(max_length=200, blank=True)
    completion_lesson_percent = models.PositiveSmallIntegerField(default=100)
    completion_quiz_percent = models.PositiveSmallIntegerField(default=100)
    requires_final_exam = models.BooleanField(default=False)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['status', 'is_active', 'kind']),
            models.Index(fields=['instructor', 'status']),
            models.Index(fields=['language', 'level']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug and self.title:
            self.slug = slugify(self.title)
        if self.is_free:
            self.price = self.price or 0
        if self.language and self.language not in SUPPORTED_LOCALES:
            self.language = 'pt'
        super().save(*args, **kwargs)

    @property
    def is_published(self):
        return self.status == self.STATUS_PUBLISHED and self.is_active


class CourseModule(models.Model):
    course = models.ForeignKey(Course, related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.course.title} / {self.title}'


class Lesson(models.Model):
    """Modelo de Aula"""
    TYPE_VIDEO = 'video'
    TYPE_ARTICLE = 'article'
    TYPE_QUIZ = 'quiz'
    TYPE_ASSIGNMENT = 'assignment'
    TYPE_RESOURCE = 'resource'
    TYPE_CHOICES = [
        (TYPE_VIDEO, 'Video'),
        (TYPE_ARTICLE, 'Article'),
        (TYPE_QUIZ, 'Quiz'),
        (TYPE_ASSIGNMENT, 'Assignment'),
        (TYPE_RESOURCE, 'Resource'),
    ]

    course = models.ForeignKey(Course, related_name='lessons', on_delete=models.CASCADE)
    module = models.ForeignKey(
        CourseModule,
        related_name='lessons',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField()
    description = models.TextField(blank=True)
    video_url = models.URLField(blank=True, help_text="URL do YouTube (não listado) ou Google Drive")
    video_file = models.FileField(
        upload_to='lesson_videos/',
        blank=True,
        null=True,
        help_text='Optional native upload (no transcoding in v1). Prefer YouTube URL.',
    )
    lesson_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_VIDEO)
    duration = models.IntegerField(help_text="Duração em minutos", default=0)
    content = models.TextField(blank=True, help_text="Conteúdo em texto da aula (HTML permitido)")
    is_free = models.BooleanField(default=False, help_text="Aula gratuita/aberta / preview")
    order = models.IntegerField(default=0, help_text="Ordem dentro do curso")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        unique_together = ['course', 'slug']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    @property
    def is_preview(self):
        return self.is_free


class LessonAttachment(models.Model):
    """Anexos das aulas (PDF, imagens, áudio, etc.)"""
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('image', 'Imagem'),
        ('audio', 'Áudio'),
        ('video', 'Vídeo'),
        ('other', 'Outro'),
    ]
    
    lesson = models.ForeignKey(Lesson, related_name='attachments', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='lesson_attachments/')
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default='other')
    description = models.TextField(blank=True, help_text="Descrição do anexo")
    order = models.IntegerField(default=0, help_text="Ordem de exibição")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.lesson.title} - {self.title}"
    
    def get_file_type_from_extension(self):
        """Detecta o tipo de arquivo pela extensão"""
        if not self.file:
            return 'other'
        ext = self.file.name.split('.')[-1].lower()
        if ext in ['pdf']:
            return 'pdf'
        elif ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']:
            return 'image'
        elif ext in ['mp3', 'wav', 'ogg', 'm4a']:
            return 'audio'
        elif ext in ['mp4', 'webm', 'mov', 'avi']:
            return 'video'
        return 'other'


class Enrollment(models.Model):
    """Inscrição do aluno no curso"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('active', 'Ativo'),
        ('cancelled', 'Cancelado'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='enrollments', on_delete=models.CASCADE)
    course = models.ForeignKey(Course, related_name='enrollments', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    referral_code = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Referral code used when enrolling (for course-specific referrals)"
    )

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-enrolled_at']

    def __str__(self):
        return f"{self.user.email} - {self.course.title}"


class PaymentProof(models.Model):
    """Comprovativo de pagamento"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
    ]

    enrollment = models.OneToOneField(Enrollment, related_name='payment_proof', on_delete=models.CASCADE)
    file = models.FileField(upload_to='payment_proofs/')
    notes = models.TextField(blank=True, help_text="Notas do aluno")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='reviewed_payments',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comprovativo - {self.enrollment}"


class Progress(models.Model):
    """Progresso do aluno na aula"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='progress', on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, related_name='progress', on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'lesson']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.lesson.title} - {'Concluído' if self.completed else 'Em progresso'}"


class Question(models.Model):
    """Pergunta de múltipla escolha"""
    TYPE_SINGLE = 'single'
    TYPE_MULTIPLE = 'multiple'
    TYPE_CHOICES = [
        (TYPE_SINGLE, 'Single choice'),
        (TYPE_MULTIPLE, 'Multiple choice'),
    ]
    DIFFICULTY_EASY = 'easy'
    DIFFICULTY_MEDIUM = 'medium'
    DIFFICULTY_HARD = 'hard'
    DIFFICULTY_CHOICES = [
        (DIFFICULTY_EASY, 'Easy'),
        (DIFFICULTY_MEDIUM, 'Medium'),
        (DIFFICULTY_HARD, 'Hard'),
    ]

    course = models.ForeignKey(Course, related_name='questions', on_delete=models.CASCADE, null=True, blank=True, help_text="Curso associado (opcional)")
    lesson = models.ForeignKey(Lesson, related_name='questions', on_delete=models.CASCADE, null=True, blank=True, help_text="Aula associada (opcional)")
    question_text = models.TextField(help_text="Texto da pergunta")
    explanation = models.TextField(blank=True, help_text="Explicação da resposta correta")
    question_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SINGLE)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default=DIFFICULTY_MEDIUM)
    image = models.ImageField(upload_to='question_images/', blank=True, null=True)
    points = models.PositiveIntegerField(default=1)
    is_required = models.BooleanField(default=True)
    time_limit_seconds = models.PositiveIntegerField(null=True, blank=True)
    order = models.IntegerField(default=0, help_text="Ordem da pergunta")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.question_text[:50] + "..." if len(self.question_text) > 50 else self.question_text


class Choice(models.Model):
    """Opção de resposta para uma pergunta"""
    question = models.ForeignKey(Question, related_name='choices', on_delete=models.CASCADE)
    choice_text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False, help_text="Marcar se esta é a resposta correta")
    order = models.IntegerField(default=0, help_text="Ordem da opção")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question.question_text[:30]}... - {self.choice_text[:30]}..."


class LessonQuiz(models.Model):
    """Quiz associado a uma aula"""
    SCORING_ALL_OR_NOTHING = 'all_or_nothing'
    SCORING_PARTIAL = 'partial'
    SCORING_CHOICES = [
        (SCORING_ALL_OR_NOTHING, 'All or nothing'),
        (SCORING_PARTIAL, 'Partial credit'),
    ]

    lesson = models.OneToOneField(Lesson, related_name='quiz', on_delete=models.CASCADE)
    title = models.CharField(max_length=200, default="Quiz da Aula")
    description = models.TextField(blank=True, help_text="Descrição do quiz")
    passing_score = models.IntegerField(default=70, help_text="Pontuação mínima para aprovação (0-100)")
    time_limit_minutes = models.IntegerField(null=True, blank=True, help_text="Tempo limite em minutos (opcional)")
    max_attempts = models.PositiveIntegerField(default=0, help_text="0 = unlimited")
    randomize_questions = models.BooleanField(default=False)
    randomize_answers = models.BooleanField(default=False)
    show_correct_after = models.BooleanField(default=True)
    show_explanations = models.BooleanField(default=True)
    allow_change_answers = models.BooleanField(default=True)
    multi_scoring = models.CharField(max_length=20, choices=SCORING_CHOICES, default=SCORING_ALL_OR_NOTHING)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Quiz da Aula"
        verbose_name_plural = "Quizzes das Aulas"

    def __str__(self):
        return f"Quiz - {self.lesson.title}"


class LessonQuizQuestion(models.Model):
    """Associação entre Quiz e Perguntas"""
    quiz = models.ForeignKey(LessonQuiz, related_name='questions', on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    points = models.IntegerField(default=1, help_text="Pontos que esta pergunta vale")
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['quiz', 'question']

    def __str__(self):
        return f"{self.quiz.lesson.title} - {self.question.question_text[:30]}..."


class FinalExam(models.Model):
    """Exame final do curso"""
    course = models.OneToOneField(Course, related_name='final_exam', on_delete=models.CASCADE)
    title = models.CharField(max_length=200, default="Exame Final")
    description = models.TextField(blank=True, help_text="Descrição do exame")
    passing_score = models.IntegerField(default=70, help_text="Pontuação mínima para aprovação (0-100)")
    time_limit_minutes = models.IntegerField(null=True, blank=True, help_text="Tempo limite em minutos (opcional)")
    max_attempts = models.IntegerField(default=3, help_text="Número máximo de tentativas permitidas")
    randomize_questions = models.BooleanField(default=False)
    randomize_answers = models.BooleanField(default=False)
    show_correct_after = models.BooleanField(default=True)
    show_explanations = models.BooleanField(default=True)
    multi_scoring = models.CharField(max_length=20, default='all_or_nothing')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Exame Final"
        verbose_name_plural = "Exames Finais"

    def __str__(self):
        return f"Exame Final - {self.course.title}"


class FinalExamQuestion(models.Model):
    """Associação entre Exame Final e Perguntas"""
    exam = models.ForeignKey(FinalExam, related_name='questions', on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    points = models.IntegerField(default=1, help_text="Pontos que esta pergunta vale")
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['exam', 'question']

    def __str__(self):
        return f"{self.exam.course.title} - {self.question.question_text[:30]}..."


class UserQuizAnswer(models.Model):
    """Resposta do usuário a um quiz de aula"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='quiz_answers', on_delete=models.CASCADE)
    quiz = models.ForeignKey(LessonQuiz, related_name='user_answers', on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    result = models.ForeignKey(
        'QuizResult', related_name='answers', on_delete=models.CASCADE, null=True, blank=True,
    )
    selected_choice = models.ForeignKey(Choice, on_delete=models.SET_NULL, null=True, blank=True)
    choice_ids = models.JSONField(default=list, blank=True)
    is_correct = models.BooleanField(default=False)
    earned_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-answered_at']

    def __str__(self):
        return f"{self.user.email} - {self.quiz.lesson.title} - Q{self.question.id}"


class UserExamAnswer(models.Model):
    """Resposta do usuário a uma pergunta do exame final"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='exam_answers', on_delete=models.CASCADE)
    exam = models.ForeignKey(FinalExam, related_name='user_answers', on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    result = models.ForeignKey(
        'ExamResult', related_name='answers', on_delete=models.CASCADE, null=True, blank=True,
    )
    selected_choice = models.ForeignKey(Choice, on_delete=models.SET_NULL, null=True, blank=True)
    choice_ids = models.JSONField(default=list, blank=True)
    is_correct = models.BooleanField(default=False)
    earned_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-answered_at']

    def __str__(self):
        return f"{self.user.email} - {self.exam.course.title} - Q{self.question.id}"


class QuizResult(models.Model):
    """Resultado do quiz de uma aula"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='quiz_results', on_delete=models.CASCADE)
    quiz = models.ForeignKey(LessonQuiz, related_name='results', on_delete=models.CASCADE)
    attempt_number = models.PositiveIntegerField(default=1)
    score = models.DecimalField(max_digits=5, decimal_places=2, help_text="Pontuação em percentagem")
    earned_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    maximum_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_questions = models.IntegerField()
    correct_answers = models.IntegerField()
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-completed_at', '-started_at']
        unique_together = ['user', 'quiz', 'attempt_number']

    def __str__(self):
        return f"{self.user.email} - {self.quiz.lesson.title} - {self.score}%"

    def calculate_score(self):
        """Calcula a pontuação baseada nas respostas"""
        answers = UserQuizAnswer.objects.filter(user=self.user, quiz=self.quiz)
        total_points = sum(qq.points for qq in self.quiz.questions.all())
        earned_points = sum(
            qq.points for answer in answers
            for qq in self.quiz.questions.filter(question=answer.question)
            if answer.is_correct
        )
        if total_points > 0:
            self.score = (earned_points / total_points) * 100
        else:
            self.score = 0
        self.passed = self.score >= self.quiz.passing_score
        self.save()


class ExamResult(models.Model):
    """Resultado do exame final"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='exam_results', on_delete=models.CASCADE)
    exam = models.ForeignKey(FinalExam, related_name='results', on_delete=models.CASCADE)
    attempt_number = models.IntegerField(default=1)
    score = models.DecimalField(max_digits=5, decimal_places=2, help_text="Pontuação em percentagem")
    earned_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    maximum_points = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_questions = models.IntegerField()
    correct_answers = models.IntegerField()
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-completed_at', '-started_at']

    def __str__(self):
        return f"{self.user.email} - {self.exam.course.title} - Tentativa {self.attempt_number} - {self.score}%"

    def calculate_score(self):
        """Calcula a pontuação baseada nas respostas"""
        answers = UserExamAnswer.objects.filter(user=self.user, exam=self.exam)
        total_points = sum(eq.points for eq in self.exam.questions.all())
        earned_points = sum(
            eq.points for answer in answers
            for eq in self.exam.questions.filter(question=answer.question)
            if answer.is_correct
        )
        if total_points > 0:
            self.score = (earned_points / total_points) * 100
        else:
            self.score = 0
        self.passed = self.score >= self.exam.passing_score
        self.save()


class ReferralShare(models.Model):
    """Track when a user shares a course"""
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='referral_shares',
        on_delete=models.CASCADE,
        help_text="User who shared the course"
    )
    course = models.ForeignKey(
        Course,
        related_name='referral_shares',
        on_delete=models.CASCADE,
        help_text="Course that was shared"
    )
    platform = models.CharField(
        max_length=50,
        blank=True,
        help_text="Social media platform (facebook, twitter, whatsapp, etc.)"
    )
    shared_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-shared_at']
        indexes = [
            models.Index(fields=['referrer', 'course']),
        ]
    
    def __str__(self):
        return f"{self.referrer.email} shared {self.course.title}"


class ReferralPoints(models.Model):
    """Track points earned from referrals"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
    ]
    
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='referral_points_earned',
        on_delete=models.CASCADE,
        help_text="User who shared and earned points"
    )
    referred_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='referral_points_received',
        on_delete=models.CASCADE,
        help_text="User who enrolled from the referral"
    )
    enrollment = models.ForeignKey(
        Enrollment,
        related_name='referral_points',
        on_delete=models.CASCADE,
        help_text="Enrollment that triggered the points"
    )
    points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1.0,
        help_text="Points earned (1 point = 1000 KZ)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Status of the points award"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='approved_referral_points',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Admin who approved the points"
    )
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['referrer', 'enrollment']
        indexes = [
            models.Index(fields=['referrer', 'status']),
            models.Index(fields=['referred_user']),
        ]
    
    def __str__(self):
        return f"{self.referrer.email} earned {self.points} points from {self.referred_user.email}"


class UserPoints(models.Model):
    """Track user's point balance and history"""
    TRANSACTION_TYPE_CHOICES = [
        ('earned', 'Ganho'),
        ('spent', 'Gasto'),
        ('expired', 'Expirado'),
        ('admin_adjustment', 'Ajuste Admin'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='points_transactions',
        on_delete=models.CASCADE
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES
    )
    points = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Points amount (positive for earned, negative for spent)"
    )
    balance_after = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="User's balance after this transaction"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of the transaction"
    )
    referral_points = models.ForeignKey(
        ReferralPoints,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Related referral points if this is from a referral"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'transaction_type']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.transaction_type} - {self.points} points"
    
    @classmethod
    def get_user_balance(cls, user):
        """Get current point balance for a user"""
        latest = cls.objects.filter(user=user).order_by('-created_at').first()
        return latest.balance_after if latest else 0


class Assignment(models.Model):
    lesson = models.OneToOneField(Lesson, related_name='assignment', on_delete=models.CASCADE)
    instructions = models.TextField()
    due_days = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return f'Assignment — {self.lesson.title}'


class AssignmentSubmission(models.Model):
    STATUS_SUBMITTED = 'submitted'
    STATUS_GRADED = 'graded'
    STATUS_CHOICES = [
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_GRADED, 'Graded'),
    ]

    assignment = models.ForeignKey(Assignment, related_name='submissions', on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignment_submissions')
    text = models.TextField(blank=True)
    file = models.FileField(upload_to='assignment_submissions/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SUBMITTED)
    grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['assignment', 'student']


class CourseReview(models.Model):
    STATUS_PUBLISHED = 'published'
    STATUS_HIDDEN = 'hidden'
    STATUS_CHOICES = [
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_HIDDEN, 'Hidden'),
    ]

    course = models.ForeignKey(Course, related_name='reviews', on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='course_reviews')
    rating = models.PositiveSmallIntegerField()
    body = models.TextField(blank=True)
    instructor_reply = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PUBLISHED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['course', 'student']
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.course_id} ★{self.rating}'


class Certificate(models.Model):
    STATUS_VALID = 'valid'
    STATUS_REVOKED = 'revoked'
    STATUS_EXPIRED = 'expired'
    STATUS_CHOICES = [
        (STATUS_VALID, 'Valid'),
        (STATUS_REVOKED, 'Revoked'),
        (STATUS_EXPIRED, 'Expired'),
    ]

    enrollment = models.OneToOneField(Enrollment, related_name='certificate', on_delete=models.CASCADE)
    course = models.ForeignKey(Course, related_name='certificates', on_delete=models.CASCADE)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certificates')
    instructor = models.ForeignKey(
        'instructors.InstructorProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_certificates',
    )
    code = models.CharField(max_length=32, unique=True)
    public_id = models.CharField(max_length=40, unique=True, null=True, blank=True)
    student_name = models.CharField(max_length=200)
    course_title = models.CharField(max_length=200)
    instructor_name = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_VALID)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.TextField(blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issued_at']

    def __str__(self):
        return self.public_id or self.code


class QuizAttemptDraft(models.Model):
    """In-progress answers so a refresh does not lose the attempt."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='quiz_drafts', on_delete=models.CASCADE)
    quiz = models.ForeignKey(LessonQuiz, related_name='drafts', on_delete=models.CASCADE)
    answers = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'quiz']
