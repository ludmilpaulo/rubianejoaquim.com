from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TaskCategoryViewSet, TaskViewSet, TargetViewSet, NotificationViewSet
)

router = DefaultRouter()
router.register(r'categories', TaskCategoryViewSet, basename='task-category')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'targets', TargetViewSet, basename='target')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
