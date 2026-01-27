"""
Signals para tarefas - verificar lembretes quando tarefas são criadas ou atualizadas
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import Task, Notification


@receiver(post_save, sender=Task)
def check_task_reminder_on_save(sender, instance, created, **kwargs):
    """
    Verifica se uma tarefa precisa de notificação quando é criada ou atualizada
    """
    # Só verificar se a tarefa não está completa ou cancelada
    if instance.status in ['completed', 'cancelled']:
        return
    
    # Só verificar se tem data de vencimento
    if not instance.due_date:
        return
    
    # Combinar data e hora se ambos existirem
    if instance.due_date and instance.due_time:
        due_datetime = timezone.make_aware(
            timezone.datetime.combine(instance.due_date, instance.due_time)
        )
    elif instance.due_date:
        # Se só tiver data, considerar fim do dia (23:59:59)
        due_datetime = timezone.make_aware(
            timezone.datetime.combine(instance.due_date, timezone.datetime.max.time())
        )
    else:
        return
    
    now = timezone.now()
    time_until_due = (due_datetime - now).total_seconds()
    
    # Verificar se está dentro da janela de 5 minutos antes (entre 4 e 6 minutos)
    if 240 <= time_until_due <= 360:
        # Verificar se já existe uma notificação recente para esta tarefa
        recent_notification = Notification.objects.filter(
            user=instance.user,
            notification_type='task_reminder',
            related_object_type='task',
            related_object_id=instance.id,
            created_at__gte=now - timedelta(minutes=10)
        ).exists()
        
        if not recent_notification:
            # Criar notificação
            time_str = instance.due_time.strftime('%H:%M') if instance.due_time else 'fim do dia'
            date_str = instance.due_date.strftime('%d/%m/%Y')
            
            Notification.objects.create(
                user=instance.user,
                title=f'Lembrete: {instance.title}',
                message=f'A tarefa "{instance.title}" vence em 5 minutos ({date_str} às {time_str}). Não se esqueça de completá-la!',
                notification_type='task_reminder',
                related_object_type='task',
                related_object_id=instance.id,
                action_url=f'/tasks/{instance.id}/',
            )
