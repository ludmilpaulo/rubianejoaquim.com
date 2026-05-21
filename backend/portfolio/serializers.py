from rest_framework import serializers
from .models import (
    PortfolioProject,
    Service,
    Testimonial,
    ShowreelVideo,
    CaseStudy,
    ZendaScreenshot,
    ZendaContent,
    HomeSection,
    SiteSettings,
    ContactMessage,
)
from .utils import normalize_locale, get_translated


class LocalizedSerializerMixin:
    """Add translated string fields from JSON (not model columns)."""
    text_fields: list[str] = []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        lang = normalize_locale(
            request.query_params.get('lang') if request else None
        )
        translations = data.pop('translations', None) or getattr(instance, 'translations', None) or {}
        for field in self.text_fields:
            fallback = data.get(field, '') if isinstance(data.get(field), str) else ''
            data[field] = get_translated(translations, field, lang, fallback)
        raw_benefits = translations.get(lang, {}).get('benefits') or translations.get('pt', {}).get('benefits')
        if raw_benefits is not None and 'benefits' not in data:
            data['benefits'] = raw_benefits if isinstance(raw_benefits, list) else []
        return data


class PortfolioProjectSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description', 'role']
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioProject
        fields = [
            'id', 'category', 'slug', 'thumbnail_url', 'video_url', 'external_url',
            'client_name', 'tools_used', 'is_featured', 'is_published', 'order',
            'translations', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_thumbnail_url(self, obj: PortfolioProject) -> str | None:
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class ServiceSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description']

    class Meta:
        model = Service
        fields = ['id', 'icon', 'order', 'is_active', 'translations']


class TestimonialSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['quote']
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = [
            'id', 'client_name', 'client_role', 'client_company', 'avatar_url',
            'rating', 'order', 'translations',
        ]

    def get_avatar_url(self, obj: Testimonial) -> str | None:
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class ShowreelVideoSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description']

    class Meta:
        model = ShowreelVideo
        fields = [
            'id', 'youtube_url', 'is_primary', 'is_published', 'order', 'translations',
        ]


class CaseStudySerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'goal', 'role', 'result']
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudy
        fields = [
            'id', 'slug', 'client_name', 'image_url', 'tools_used', 'order', 'translations',
        ]

    def get_image_url(self, obj: CaseStudy) -> str | None:
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ZendaScreenshotSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ZendaScreenshot
        fields = ['id', 'image_url', 'caption', 'order']

    def get_image_url(self, obj: ZendaScreenshot) -> str | None:
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ZendaContentSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['headline', 'subheadline', 'what_is', 'who_it_helps', 'benefits_text']
    screenshots = serializers.SerializerMethodField()
    benefits = serializers.SerializerMethodField()

    class Meta:
        model = ZendaContent
        fields = [
            'id', 'app_store_url', 'play_store_url', 'monthly_price_kz',
            'screenshots', 'benefits', 'translations',
        ]

    def get_screenshots(self, obj: ZendaContent) -> list:
        qs = obj.screenshots.filter(is_published=True)
        return ZendaScreenshotSerializer(qs, many=True, context=self.context).data

    def get_benefits(self, obj: ZendaContent) -> list:
        request = self.context.get('request')
        lang = normalize_locale(request.query_params.get('lang') if request else None)
        translations = obj.translations or {}
        raw = translations.get(lang, {}).get('benefits') or translations.get('pt', {}).get('benefits')
        return raw if isinstance(raw, list) else []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'benefits' not in data or not data['benefits']:
            request = self.context.get('request')
            lang = normalize_locale(request.query_params.get('lang') if request else None)
            translations = instance.translations or {}
            raw = translations.get(lang, {}).get('benefits') or translations.get('pt', {}).get('benefits')
            data['benefits'] = raw if isinstance(raw, list) else []
        return data


class HomeSectionSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'subtitle', 'body', 'cta_label']

    class Meta:
        model = HomeSection
        fields = ['id', 'section_key', 'is_active', 'extra_data', 'translations']


class SiteSettingsSerializer(serializers.ModelSerializer):
    og_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            'id', 'contact_email', 'whatsapp_number', 'phone',
            'instagram_url', 'linkedin_url', 'youtube_url', 'tiktok_url',
            'og_image_url',
        ]

    def get_og_image_url(self, obj: SiteSettings) -> str | None:
        if obj.og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.og_image.url)
            return obj.og_image.url
        return None


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'email', 'phone', 'subject', 'message', 'locale', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        return ContactMessage.objects.create(**validated_data)


class ContactMessageAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'
