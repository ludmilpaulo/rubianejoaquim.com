"""Public CMS API — alias routes at /api/public/ (same handlers as /api/portfolio/)."""
from django.urls import path, include
from . import urls as portfolio_urls

urlpatterns = [
    path('', include(portfolio_urls.router.urls)),
    path('admin/', include(portfolio_urls.admin_router.urls)),
]
