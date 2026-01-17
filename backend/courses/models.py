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
    video_url = models.URLField(help_text="URL do YouTube (não listado) ou Google Drive")
    duration = models.IntegerField(help_text="Duração em minutos", default=0)
    content = models.TextField(blank=True, help_text="Conteúdo em texto da aula")
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
    """Anexos PDF ou outros ficheiros das aulas"""
    lesson = models.ForeignKey(Lesson, related_name='attachments', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='lesson_attachments/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.lesson.title} - {self.title}"


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
