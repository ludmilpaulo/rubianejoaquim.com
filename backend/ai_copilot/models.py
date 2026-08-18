from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Conversation(models.Model):
    """Conversa com o AI Financial Copilot"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_conversations')
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Conversa'
        verbose_name_plural = 'Conversas'

    def __str__(self):
        return f"{self.user.email} - {self.title or 'Conversa sem título'}"


class Message(models.Model):
    """Mensagem em uma conversa"""
    ROLE_CHOICES = [
        ('user', 'Usuário'),
        ('assistant', 'Assistente'),
        ('system', 'Sistema'),
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    facts = models.JSONField(null=True, blank=True)
    proposed_action = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Mensagem'
        verbose_name_plural = 'Mensagens'

    def __str__(self):
        return f"{self.role} - {self.content[:50]}..."


class FinancialSnapshot(models.Model):
    """Cached monthly financial summary for AI health trends."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='financial_snapshots')
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    income = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    expenses = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    savings = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    debt_payments = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    available = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='AOA')
    components = models.JSONField(default=dict, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'month', 'year']
        ordering = ['-year', '-month']


class AIInsight(models.Model):
    """Stored pattern insight with auditable source data."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_insights')
    insight_type = models.CharField(max_length=64)
    message = models.TextField()
    source_data = models.JSONField(default=dict)
    month = models.PositiveSmallIntegerField(null=True, blank=True)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
