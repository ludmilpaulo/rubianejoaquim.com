from django.urls import path
from instructors.views import locales_view

urlpatterns = [
    path('', locales_view),
]
