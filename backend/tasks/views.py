from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import datetime, timedelta

from .models import TaskCategory, Task, Target, Notification
from .serializers import (
    TaskCategorySerializer, TaskSerializer, TargetSerializer, NotificationSerializer
)


class TaskCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para categorias de tarefas"""
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet para tarefas"""
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.filter(user=user)
        
        # Filtros
        status_filter = self.request.query_params.get('status', None)
        priority = self.request.query_params.get('priority', None)
        category = self.request.query_params.get('category', None)
        due_date = self.request.query_params.get('due_date', None)
        overdue = self.request.query_params.get('overdue', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category_id=category)
        if due_date:
            queryset = queryset.filter(due_date=due_date)
        if overdue == 'true':
            queryset = queryset.filter(due_date__lt=timezone.now().date(), status__in=['pending', 'in_progress'])
        
        return queryset.order_by('-due_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Marca uma tarefa como concluída"""
        task = self.get_object()
        task.status = 'completed'
        task.completed_at = timezone.now()
        task.save()
        
        # Criar notificação de conclusão
        Notification.objects.create(
            user=request.user,
            title='Tarefa Concluída!',
            message=f'Você concluiu a tarefa: {task.title}',
            notification_type='achievement',
            related_object_type='task',
            related_object_id=task.id,
        )
        
        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Tarefas de hoje"""
        today = timezone.now().date()
        tasks = Task.objects.filter(
            user=request.user,
            due_date=today,
            status__in=['pending', 'in_progress']
        )
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Próximas tarefas (próximos 7 dias)"""
        today = timezone.now().date()
        week_from_now = today + timedelta(days=7)
        tasks = Task.objects.filter(
            user=request.user,
            due_date__gte=today,
            due_date__lte=week_from_now,
            status__in=['pending', 'in_progress']
        )
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estatísticas das tarefas"""
        user = request.user
        total = Task.objects.filter(user=user).count()
        completed = Task.objects.filter(user=user, status='completed').count()
        pending = Task.objects.filter(user=user, status='pending').count()
        in_progress = Task.objects.filter(user=user, status='in_progress').count()
        overdue = Task.objects.filter(
            user=user,
            due_date__lt=timezone.now().date(),
            status__in=['pending', 'in_progress']
        ).count()
        
        return Response({
            'total': total,
            'completed': completed,
            'pending': pending,
            'in_progress': in_progress,
            'overdue': overdue,
            'completion_rate': (completed / total * 100) if total > 0 else 0,
        })


class TargetViewSet(viewsets.ModelViewSet):
    """ViewSet para metas"""
    serializer_class = TargetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Target.objects.filter(user=user)
        
        status_filter = self.request.query_params.get('status', None)
        target_type = self.request.query_params.get('target_type', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if target_type:
            queryset = queryset.filter(target_type=target_type)
        
        return queryset.order_by('-target_date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
        # Criar notificação de nova meta
        target = serializer.instance
        Notification.objects.create(
            user=self.request.user,
            title='Nova Meta Criada!',
            message=f'Você criou uma nova meta: {target.title}',
            notification_type='target_milestone',
            related_object_type='target',
            related_object_id=target.id,
        )

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Atualiza o progresso de uma meta"""
        target = self.get_object()
        new_value = request.data.get('current_value', None)
        
        if new_value is not None:
            target.current_value = new_value
            
            # Verificar se a meta foi alcançada
            if target.target_value and target.current_value >= target.target_value:
                target.status = 'completed'
                Notification.objects.create(
                    user=request.user,
                    title='Meta Alcançada! 🎉',
                    message=f'Parabéns! Você alcançou a meta: {target.title}',
                    notification_type='goal_achievement',
                    related_object_type='target',
                    related_object_id=target.id,
                )
            
            target.save()
        
        serializer = self.get_serializer(target)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet para notificações"""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.filter(user=user)
        
        is_read = self.request.query_params.get('is_read', None)
        notification_type = self.request.query_params.get('type', None)
        
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read == 'true')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marca uma notificação como lida"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas as notificações como lidas"""
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'message': 'Todas as notificações foram marcadas como lidas'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Conta notificações não lidas"""
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})
