"""
URL configuration for Rubiane Joaquim Educação Financeira project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import app_version, app_version_v2, tiktok_domain_verification

urlpatterns = [
    path('tiktokFpaaRaUmoGf5Zl6lZ8hX77igVQZVuzJS.txt', tiktok_domain_verification),
    path('admin/', admin.site.urls),
    path('api/config/app-version/', app_version),
    path('api/app/version/', app_version_v2),
    path('api/locales/', include('config.locale_urls')),
    path('api/instructors/', include('instructors.urls')),
    path('api/course/', include('courses.urls')),
    path('api/mentorship/', include('mentorship.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/ai-copilot/', include('ai_copilot.urls')),
    path('api/subscriptions/', include('subscriptions.urls')),
    path('api/portfolio/', include('portfolio.urls')),
    path('api/public/', include('portfolio.public_urls')),
    path('api/finance-space/', include('finance_space.urls')),
    path('api/wallet/', include('wallet.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
