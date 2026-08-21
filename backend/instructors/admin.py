from django.contrib import admin
from .models import (
    EducatorApplication,
    EducationBillingSettings,
    EducationPayment,
    InstructorProfile,
    MentorProfile,
    PayoutMethod,
    PayoutRequest,
    TutorBooking,
    TutorProfile,
)


@admin.register(EducatorApplication)
class EducatorApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['full_name', 'user__email']


@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display = ['slug', 'user', 'status', 'is_official', 'rating_avg']
    list_filter = ['status', 'is_official']
    search_fields = ['slug', 'user__email', 'headline']


@admin.register(MentorProfile)
class MentorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'rating_avg']


@admin.register(TutorProfile)
class TutorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'hourly_rate', 'currency']


@admin.register(PayoutMethod)
class PayoutMethodAdmin(admin.ModelAdmin):
    list_display = ['instructor', 'method', 'payee_name', 'is_default']


@admin.register(EducationBillingSettings)
class EducationBillingSettingsAdmin(admin.ModelAdmin):
    list_display = ['platform_commission_percent', 'default_currency', 'updated_at']


@admin.register(EducationPayment)
class EducationPaymentAdmin(admin.ModelAdmin):
    list_display = ['student', 'instructor', 'product_type', 'amount', 'status', 'created_at']
    list_filter = ['status', 'product_type', 'payment_method']


@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    list_display = ['instructor', 'amount', 'currency', 'status', 'requested_at']
    list_filter = ['status']


@admin.register(TutorBooking)
class TutorBookingAdmin(admin.ModelAdmin):
    list_display = ['tutor', 'student', 'starts_at', 'status']
    list_filter = ['status']
