"""
Management command para enviar lembretes semanais aos usuários
para adicionar dinheiro aos seus objetivos ativos.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from datetime import timedelta
from finance.models import Goal
from tasks.models import Notification


class Command(BaseCommand):
    help = 'Envia lembretes semanais para adicionar dinheiro aos objetivos ativos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--day-of-week',
            type=int,
            default=1,  # Monday (0=Sunday, 1=Monday, etc.)
            help='Dia da semana para enviar lembretes (0=Sunday, 1=Monday, etc.)',
        )

    def handle(self, *args, **options):
        now = timezone.now()
        day_of_week = options['day_of_week']
        
        # Verificar se hoje é o dia da semana especificado
        if now.weekday() != day_of_week:
            self.stdout.write(
                self.style.SUCCESS(f'Hoje não é o dia de enviar lembretes (dia {day_of_week}). Pulando...')
            )
            return
        
        # Buscar objetivos ativos que ainda não foram alcançados
        active_goals = Goal.objects.filter(
            status='active',
        ).exclude(
            current_amount__gte=models.F('target_amount')  # Excluir objetivos já alcançados
        )
        
        notifications_created = 0
        
        for goal in active_goals:
            # Verificar se já existe uma notificação recente para este objetivo
            # (últimos 6 dias para evitar duplicatas)
            recent_notification = Notification.objects.filter(
                user=goal.user,
                notification_type='goal_reminder',
                related_object_type='goal',
                related_object_id=goal.id,
                created_at__gte=now - timedelta(days=6)
            ).exists()
            
            if not recent_notification:
                # Calcular progresso
                progress_percentage = (goal.current_amount / goal.target_amount * 100) if goal.target_amount > 0 else 0
                remaining = goal.target_amount - goal.current_amount
                
                # Criar notificação
                from decimal import Decimal
                remaining_formatted = f"{remaining:.2f}"
                Notification.objects.create(
                    user=goal.user,
                    title=f'Lembrete Semanal: {goal.title}',
                    message=f'Não se esqueça de adicionar dinheiro ao seu objetivo "{goal.title}". Você já alcançou {progress_percentage:.0f}% do objetivo. Restam {remaining_formatted} para completar!',
                    notification_type='goal_reminder',
                    related_object_type='goal',
                    related_object_id=goal.id,
                    action_url=f'/finance/goals/{goal.id}/',
                )
                notifications_created += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Notificação criada para objetivo: {goal.title} (ID: {goal.id}) - Usuário: {goal.user.email}'
                    )
                )
        
        if notifications_created == 0:
            self.stdout.write(
                self.style.SUCCESS('Nenhum objetivo precisa de notificação no momento.')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Total de {notifications_created} notificação(ões) criada(s).')
            )
