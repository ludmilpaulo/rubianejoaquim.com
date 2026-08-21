from rest_framework import serializers

from .models import (
    EducatorApplication,
    EducationBillingSettings,
    EducationPayment,
    InstructorProfile,
    MentorProfile,
    PayoutMethod,
    PayoutRequest,
    SavedItem,
    TutorAvailability,
    TutorBooking,
    TutorOffering,
    TutorProfile,
)


class EducatorApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducatorApplication
        fields = [
            'id', 'full_name', 'profile_photo', 'biography', 'country', 'languages',
            'areas_of_expertise', 'qualifications', 'experience', 'teaching_experience',
            'areas_to_teach', 'linkedin_url', 'website', 'youtube_channel', 'social_profiles',
            'identification_notes', 'payout_method_preview', 'payout_details',
            'roles_requested', 'status', 'admin_notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'admin_notes', 'created_at', 'updated_at']


class InstructorPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)
    photo_url = serializers.SerializerMethodField()
    courses_count = serializers.SerializerMethodField()

    class Meta:
        model = InstructorProfile
        fields = [
            'id', 'slug', 'display_name', 'headline', 'bio', 'country', 'languages',
            'expertise', 'qualifications', 'experience', 'linkedin_url', 'website',
            'youtube_channel', 'social_profiles', 'photo_url', 'is_official',
            'rating_avg', 'rating_count', 'students_count', 'courses_count',
        ]

    def get_photo_url(self, obj):
        if not obj.photo:
            return obj.user.profile_image_url or None
        request = self.context.get('request')
        url = obj.photo.url
        return request.build_absolute_uri(url) if request else url

    def get_courses_count(self, obj):
        from courses.models import Course
        return Course.objects.filter(
            instructor=obj,
            status=Course.STATUS_PUBLISHED,
            is_active=True,
        ).count()


class InstructorMeSerializer(InstructorPublicSerializer):
    class Meta(InstructorPublicSerializer.Meta):
        fields = InstructorPublicSerializer.Meta.fields + ['status']


class MentorPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()

    class Meta:
        model = MentorProfile
        fields = [
            'id', 'slug', 'display_name', 'headline', 'bio', 'timezone', 'languages',
            'subjects', 'meeting_method', 'rating_avg', 'rating_count', 'status',
        ]

    def get_display_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    def get_slug(self, obj):
        inst = obj.instructor
        return inst.slug if inst else f'mentor-{obj.pk}'


class TutorPublicSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = [
            'id', 'display_name', 'headline', 'bio', 'timezone', 'languages', 'subjects',
            'hourly_rate', 'currency', 'session_duration_minutes', 'meeting_method',
            'rating_avg', 'rating_count', 'status',
        ]

    def get_display_name(self, obj):
        return obj.user.get_full_name() or obj.user.email


class PayoutMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutMethod
        fields = [
            'id', 'method', 'payee_name', 'iban', 'bank_name', 'mobile_wallet',
            'currency', 'is_default', 'created_at',
        ]
        read_only_fields = ['created_at']


class EducationPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationPayment
        fields = [
            'id', 'product_type', 'product_id', 'product_title', 'amount', 'currency',
            'platform_fee', 'instructor_net', 'commission_percent', 'payment_method',
            'status', 'created_at', 'completed_at',
        ]


class PayoutRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'amount', 'currency', 'method', 'payee_snapshot', 'status',
            'requested_at', 'processed_at', 'notes',
        ]
        read_only_fields = ['status', 'requested_at', 'processed_at', 'notes', 'payee_snapshot']


class EducationBillingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EducationBillingSettings
        fields = ['platform_commission_percent', 'default_currency', 'payout_hold_days', 'updated_at']
        read_only_fields = ['updated_at']


class TutorOfferingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorOffering
        fields = [
            'id', 'title', 'description', 'subjects', 'hourly_rate', 'currency',
            'session_duration_minutes', 'is_active', 'created_at',
        ]


class TutorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorAvailability
        fields = ['id', 'weekday', 'start_time', 'end_time', 'is_active']


class TutorBookingSerializer(serializers.ModelSerializer):
    tutor_name = serializers.SerializerMethodField()

    class Meta:
        model = TutorBooking
        fields = [
            'id', 'tutor', 'offering', 'starts_at', 'ends_at', 'duration_minutes',
            'status', 'meeting_provider', 'meeting_url', 'notes', 'tutor_name', 'created_at',
        ]
        read_only_fields = ['status', 'meeting_url', 'created_at', 'student']
        extra_kwargs = {
            'ends_at': {'required': False},
            'offering': {'required': False},
            'meeting_provider': {'required': False},
            'notes': {'required': False},
            'duration_minutes': {'required': False},
        }

    def get_tutor_name(self, obj):
        return obj.tutor.user.get_full_name() or obj.tutor.user.email


class SavedItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedItem
        fields = ['id', 'kind', 'object_id', 'created_at']
        read_only_fields = ['created_at']
