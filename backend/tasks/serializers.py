from rest_framework import serializers
from .models import TaskCategory, Task, Target, Notification


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = ['id', 'name', 'icon', 'color', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True)
    category_color = serializers.CharField(source='category.color', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'category', 'category_name', 'category_icon', 'category_color',
            'title', 'description', 'due_date', 'due_time', 'priority', 'status',
            'is_recurring', 'recurrence_pattern', 'completed_at', 'is_overdue',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['completed_at', 'created_at', 'updated_at']


class TargetSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    remaining_value = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    days_remaining = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Target
        fields = [
            'id', 'title', 'description', 'target_type', 'target_value',
            'current_value', 'unit', 'start_date', 'target_date', 'status',
            'milestones', 'progress_percentage', 'remaining_value', 'days_remaining',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'is_read',
            'action_url', 'related_object_type', 'related_object_id',
            'created_at', 'read_at'
        ]
        read_only_fields = ['created_at', 'read_at']
