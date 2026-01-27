from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = get_user_model()


class TaskCategory(models.Model):
    """Categoria para tarefas"""
    name = models.CharField(max_length=100, help_text="Nome da categoria")
    icon = models.CharField(max_length=50, default="check-circle", help_text="Ícone da categoria")
    color = models.CharField(max_length=7, default="#6366f1", help_text="Cor em hexadecimal")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Categoria de Tarefa"
        verbose_name_plural = "Categorias de Tarefas"
        ordering = ['name']

    def __str__(self):
        return self.name


class Task(models.Model):
    """Tarefa/To-do item"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    category = models.ForeignKey(TaskCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    title = models.CharField(max_length=200, help_text="Título da tarefa")
    description = models.TextField(blank=True, help_text="Descrição detalhada")
    due_date = models.DateField(null=True, blank=True, help_text="Data de vencimento")
    due_time = models.TimeField(null=True, blank=True, help_text="Hora de vencimento")
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Baixa'),
            ('medium', 'Média'),
            ('high', 'Alta'),
            ('urgent', 'Urgente'),
        ],
        default='medium'
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pendente'),
            ('in_progress', 'Em Progresso'),
            ('completed', 'Concluída'),
            ('cancelled', 'Cancelada'),
        ],
        default='pending'
    )
    is_recurring = models.BooleanField(default=False, help_text="Tarefa recorrente")
    recurrence_pattern = models.CharField(
        max_length=50,
        choices=[
            ('daily', 'Diária'),
            ('weekly', 'Semanal'),
            ('monthly', 'Mensal'),
        ],
        blank=True,
        null=True
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    @property
    def is_overdue(self):
        """Verifica se a tarefa está atrasada"""
        if self.due_date and self.status not in ['completed', 'cancelled']:
            from django.utils import timezone
            return timezone.now().date() > self.due_date
        return False


class Target(models.Model):
    """Meta/Objetivo de longo prazo"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='targets')
    title = models.CharField(max_length=200, help_text="Título da meta")
    description = models.TextField(blank=True, help_text="Descrição detalhada")
    target_type = models.CharField(
        max_length=50,
        choices=[
            ('financial', 'Financeira'),
            ('career', 'Carreira'),
            ('health', 'Saúde'),
            ('education', 'Educação'),
            ('personal', 'Pessoal'),
            ('business', 'Negócio'),
            ('other', 'Outro'),
        ],
        default='personal'
    )
    target_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor alvo (se aplicável)"
    )
    current_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    unit = models.CharField(max_length=50, blank=True, help_text="Unidade de medida (ex: KZ, kg, horas)")
    start_date = models.DateField(help_text="Data de início")
    target_date = models.DateField(help_text="Data alvo para alcançar")
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Ativa'),
            ('completed', 'Concluída'),
            ('paused', 'Pausada'),
            ('cancelled', 'Cancelada'),
        ],
        default='active'
    )
    milestones = models.JSONField(default=list, blank=True, help_text="Marcos intermediários")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Meta"
        verbose_name_plural = "Metas"
        ordering = ['-target_date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    @property
    def progress_percentage(self):
        """Percentual de progresso"""
        if not self.target_value or self.target_value == 0:
            return 0
        return min((self.current_value / self.target_value) * 100, 100)

    @property
    def remaining_value(self):
        """Valor restante"""
        if not self.target_value:
            return None
        return max(self.target_value - self.current_value, 0)

    @property
    def days_remaining(self):
        """Dias restantes"""
        from django.utils import timezone
        if self.target_date:
            delta = self.target_date - timezone.now().date()
            return max(delta.days, 0)
        return None


class Notification(models.Model):
    """Notificação para o usuário"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200, help_text="Título da notificação")
    message = models.TextField(help_text="Mensagem da notificação")
    notification_type = models.CharField(
        max_length=50,
        choices=[
            ('task_reminder', 'Lembrete de Tarefa'),
            ('target_milestone', 'Marco de Meta'),
            ('goal_achievement', 'Conquista de Objetivo'),
            ('goal_reminder', 'Lembrete de Objetivo'),
            ('payment_due', 'Pagamento Vencendo'),
            ('system', 'Sistema'),
            ('achievement', 'Conquista'),
            ('reminder', 'Lembrete'),
        ],
        default='system'
    )
    is_read = models.BooleanField(default=False, help_text="Notificação lida")
    action_url = models.CharField(max_length=500, blank=True, help_text="URL de ação (opcional)")
    related_object_type = models.CharField(max_length=50, blank=True, help_text="Tipo do objeto relacionado")
    related_object_id = models.IntegerField(null=True, blank=True, help_text="ID do objeto relacionado")
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    def mark_as_read(self):
        """Marca a notificação como lida"""
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save()
