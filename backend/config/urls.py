"""
URL configuration for Rubiane Joaquim Educação Financeira project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import app_version

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/config/app-version/', app_version),
    path('api/auth/', include('accounts.urls')),
    path('api/course/', include('courses.urls')),
    path('api/mentorship/', include('mentorship.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/ai-copilot/', include('ai_copilot.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
