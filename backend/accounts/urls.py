from django.urls import path
from .views import RegisterView, login_view, me_view, update_profile

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', login_view, name='login'),
    path('me/', me_view, name='me'),
    path('profile/', update_profile, name='update-profile'),
]
