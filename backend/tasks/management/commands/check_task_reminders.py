"""
Management command para verificar tarefas que estão próximas do vencimento
e enviar notificações 5 minutos antes da data/hora definida.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from tasks.models import Task, Notification


class Command(BaseCommand):
    help = 'Verifica tarefas que estão próximas do vencimento e envia notificações 5 minutos antes'

    def handle(self, *args, **options):
        now = timezone.now()
        # 5 minutos a partir de agora
        reminder_time = now + timedelta(minutes=5)
        
        # Buscar tarefas que não estão completas ou canceladas
        # e que têm data/hora de vencimento próxima (dentro de 5 minutos)
        tasks_to_notify = Task.objects.filter(
            status__in=['pending', 'in_progress'],
            due_date__isnull=False,
        ).exclude(
            # Excluir tarefas que já passaram do vencimento
            due_date__lt=now.date()
        )

        notifications_created = 0
        
        for task in tasks_to_notify:
            # Combinar data e hora se ambos existirem
            if task.due_date and task.due_time:
                due_datetime = timezone.make_aware(
                    timezone.datetime.combine(task.due_date, task.due_time)
                )
            elif task.due_date:
                # Se só tiver data, considerar fim do dia (23:59:59)
                due_datetime = timezone.make_aware(
                    timezone.datetime.combine(task.due_date, timezone.datetime.max.time())
                )
            else:
                continue  # Pular se não tiver data de vencimento
            
            # Verificar se está dentro da janela de 5 minutos antes
            time_until_due = (due_datetime - now).total_seconds()
            
            # Notificar se está entre 4.5 e 5.5 minutos antes (janela de 1 minuto)
            if 240 <= time_until_due <= 360:  # Entre 4 e 6 minutos (janela de segurança)
                # Verificar se já existe uma notificação recente para esta tarefa
                recent_notification = Notification.objects.filter(
                    user=task.user,
                    notification_type='task_reminder',
                    related_object_type='task',
                    related_object_id=task.id,
                    created_at__gte=now - timedelta(minutes=10)  # Últimos 10 minutos
                ).exists()
                
                if not recent_notification:
                    # Criar notificação
                    time_str = task.due_time.strftime('%H:%M') if task.due_time else 'fim do dia'
                    date_str = task.due_date.strftime('%d/%m/%Y')
                    
                    Notification.objects.create(
                        user=task.user,
                        title=f'Lembrete: {task.title}',
                        message=f'A tarefa "{task.title}" vence em 5 minutos ({date_str} às {time_str}). Não se esqueça de completá-la!',
                        notification_type='task_reminder',
                        related_object_type='task',
                        related_object_id=task.id,
                        action_url=f'/tasks/{task.id}/',
                    )
                    notifications_created += 1
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Notificação criada para tarefa: {task.title} (ID: {task.id}) - Usuário: {task.user.email}'
                        )
                    )
        
        if notifications_created == 0:
            self.stdout.write(
                self.style.SUCCESS('Nenhuma tarefa precisa de notificação no momento.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Total de {notifications_created} notificação(ões) criada(s).')
            )
