from django.db import models
from django.conf import settings


class MentorshipPackage(models.Model):
    """Pacotes de mentoria"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    duration_minutes = models.IntegerField(help_text="Duração em minutos (30, 60, etc.)")
    sessions = models.IntegerField(default=1, help_text="Número de sessões")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title


class MentorshipRequest(models.Model):
    """Pedido de mentoria"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('scheduled', 'Agendado'),
        ('completed', 'Concluído'),
        ('cancelled', 'Cancelado'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='mentorship_requests', on_delete=models.CASCADE)
    package = models.ForeignKey(MentorshipPackage, related_name='requests', on_delete=models.CASCADE)
    objective = models.TextField(help_text="Objetivo da mentoria")
    availability = models.TextField(help_text="Disponibilidade do aluno")
    contact = models.CharField(max_length=200, help_text="Contacto (WhatsApp, email, etc.)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, help_text="Notas internas (admin)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.package.title} - {self.get_status_display()}"


class MentorshipPaymentProof(models.Model):
    """Comprovativo de pagamento da mentoria"""
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('approved', 'Aprovado'),
        ('rejected', 'Rejeitado'),
    ]

    request = models.OneToOneField(MentorshipRequest, related_name='payment_proof', on_delete=models.CASCADE)
    file = models.FileField(upload_to='mentorship_payment_proofs/')
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='reviewed_mentorship_payments',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comprovativo Mentoria - {self.request}"
