from django.contrib import admin
from .models import TaskCategory, Task, Target, Notification


@admin.register(TaskCategory)
class TaskCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'color', 'created_at']
    search_fields = ['name']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'priority', 'status', 'due_date', 'created_at']
    list_filter = ['status', 'priority', 'category', 'due_date']
    search_fields = ['user__username', 'title', 'description']
    date_hierarchy = 'due_date'


@admin.register(Target)
class TargetAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'target_type', 'status', 'target_date', 'created_at']
    list_filter = ['status', 'target_type', 'target_date']
    search_fields = ['user__username', 'title', 'description']
    date_hierarchy = 'target_date'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__username', 'title', 'message']
    date_hierarchy = 'created_at'
    readonly_fields = ['read_at']
