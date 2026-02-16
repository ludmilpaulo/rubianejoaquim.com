from django.urls import path
from .views import (
    RegisterView,
    login_view,
    me_view,
    update_profile,
    request_account_deletion,
    forgot_password,
    password_reset_confirm,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', login_view, name='login'),
    path('me/', me_view, name='me'),
    path('profile/', update_profile, name='update-profile'),
    path('request-deletion/', request_account_deletion, name='request-account-deletion'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('password-reset-confirm/', password_reset_confirm, name='password-reset-confirm'),
]
