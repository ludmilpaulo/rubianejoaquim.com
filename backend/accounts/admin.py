from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SocialAccount, OAuthState, AppReferralEvent


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'first_name', 'last_name', 'email_verified', 'is_staff', 'created_at']
    list_filter = ['is_staff', 'is_superuser', 'email_verified', 'created_at']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Perfil Zenda', {
            'fields': (
                'email_verified', 'phone', 'address', 'referral_code', 'referred_by',
                'preferred_locale', 'preferred_currency', 'profile_photo', 'profile_image_url',
                'onboarding_completed', 'onboarding_goals', 'finance_level', 'dark_mode',
                'notification_prefs',
            ),
        }),
    )


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'provider', 'provider_user_id', 'provider_email', 'created_at']
    list_filter = ['provider', 'created_at']
    search_fields = ['provider_user_id', 'provider_email', 'user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(OAuthState)
class OAuthStateAdmin(admin.ModelAdmin):
    list_display = ['state', 'provider', 'purpose', 'user', 'created_at', 'expires_at', 'consumed_at']
    list_filter = ['provider', 'purpose']
    readonly_fields = ['state', 'created_at']


@admin.register(AppReferralEvent)
class AppReferralEventAdmin(admin.ModelAdmin):
    list_display = ['event_type', 'referral_code', 'referrer', 'platform', 'created_user', 'created_at']
    list_filter = ['event_type', 'platform', 'created_at']
    search_fields = ['referral_code', 'referrer__email', 'created_user__email']
