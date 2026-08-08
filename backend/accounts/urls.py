from django.urls import path
from .views import (
    RegisterView,
    login_view,
    me_view,
    update_profile,
    request_account_deletion,
    forgot_password,
    password_reset_confirm,
    send_app_update_notification,
)
from . import social_views

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', login_view, name='login'),
    path('logout/', social_views.logout_view, name='logout'),
    path('me/', me_view, name='me'),
    path('profile/', update_profile, name='update-profile'),
    path('request-deletion/', request_account_deletion, name='request-account-deletion'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('password-reset-confirm/', password_reset_confirm, name='password-reset-confirm'),
    path('send-app-update-notification/', send_app_update_notification, name='send-app-update-notification'),

    # Social login (Google / Facebook / TikTok)
    path('social/config/', social_views.social_config, name='social-config'),
    path('social/google/', social_views.google_login, name='social-google'),
    path('social/facebook/', social_views.facebook_login, name='social-facebook'),
    path('social/link-confirm/', social_views.social_link_confirm, name='social-link-confirm'),
    path('social/tiktok/', social_views.tiktok_start, name='social-tiktok-start'),
    path('social/tiktok/callback/', social_views.tiktok_callback, name='social-tiktok-callback'),
    path('social/methods/', social_views.login_methods, name='social-methods'),
    path('social/<str:provider>/unlink/', social_views.unlink_provider, name='social-unlink'),
]
