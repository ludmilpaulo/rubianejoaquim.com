from django.db import models
from django.conf import settings


class Course(models.Model):
    """Modelo de Curso"""
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

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title


class Lesson(models.Model):
    """Modelo de Aula"""
    course = models.ForeignKey(Course, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    slug = models.SlugField()
    description = models.TextField(blank=True)
    video_url = models.URLField(blank=True, help_text="URL do YouTube (não listado) ou Google Drive")
    duration = models.IntegerField(help_text="Duração em minutos", default=0)
    content = models.TextField(blank=True, help_text="Conteúdo em texto da aula (HTML permitido)")
    is_free = models.BooleanField(default=False, help_text="Aula gratuita/aberta")
    order = models.IntegerField(default=0, help_text="Ordem dentro do curso")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        unique_together = ['course', 'slug']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


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
    question_text = models.TextField(help_text="Texto da pergunta")
    explanation = models.TextField(blank=True, help_text="Explicação da resposta correta")
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
    lesson = models.OneToOneField(Lesson, related_name='quiz', on_delete=models.CASCADE)
    title = models.CharField(max_length=200, default="Quiz da Aula")
    description = models.TextField(blank=True, help_text="Descrição do quiz")
    passing_score = models.IntegerField(default=70, help_text="Pontuação mínima para aprovação (0-100)")
    time_limit_minutes = models.IntegerField(null=True, blank=True, help_text="Tempo limite em minutos (opcional)")
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
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'quiz', 'question']
        ordering = ['-answered_at']

    def __str__(self):
        return f"{self.user.email} - {self.quiz.lesson.title} - Q{self.question.id}"


class UserExamAnswer(models.Model):
    """Resposta do usuário a uma pergunta do exame final"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='exam_answers', on_delete=models.CASCADE)
    exam = models.ForeignKey(FinalExam, related_name='user_answers', on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'exam', 'question']
        ordering = ['-answered_at']

    def __str__(self):
        return f"{self.user.email} - {self.exam.course.title} - Q{self.question.id}"


class QuizResult(models.Model):
    """Resultado do quiz de uma aula"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='quiz_results', on_delete=models.CASCADE)
    quiz = models.ForeignKey(LessonQuiz, related_name='results', on_delete=models.CASCADE)
    score = models.DecimalField(max_digits=5, decimal_places=2, help_text="Pontuação em percentagem")
    total_questions = models.IntegerField()
    correct_answers = models.IntegerField()
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-completed_at', '-started_at']
        unique_together = ['user', 'quiz']

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
