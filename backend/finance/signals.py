"""
Signal handlers para o app finance
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import Goal
from tasks.models import Notification


@receiver(post_save, sender=Goal)
def create_weekly_goal_reminder(sender, instance, created, **kwargs):
    """
    Quando um novo objetivo é criado, agenda um lembrete semanal
    (será criado pelo management command check_goal_reminders)
    """
    if created and instance.status == 'active':
        # O lembrete será criado pelo management command semanalmente
        # Este signal apenas garante que objetivos novos estão prontos para receber lembretes
        pass
