from rest_framework import serializers
from .models import (
    PortfolioProject,
    Service,
    Testimonial,
    ShowreelVideo,
    CaseStudy,
    ZendaScreenshot,
    ZendaContent,
    ZendaFeature,
    HomeSection,
    SiteSettings,
    ContactMessage,
    NavItem,
    FAQ,
    Resource,
    HomepageStatistic,
    NewsletterSubscriber,
    PageSEO,
)
from .utils import normalize_locale, get_locale_block, get_translated, portfolio_category_label


class LocalizedSerializerMixin:
    """Add translated string fields from JSON (not model columns)."""
    text_fields: list[str] = []
    include_translations = False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        lang = normalize_locale(
            request.query_params.get('lang') if request else None
        )
        translations = getattr(instance, 'translations', None) or data.get('translations') or {}
        if not self.include_translations:
            data.pop('translations', None)
        for field in self.text_fields:
            fallback = data.get(field, '') if isinstance(data.get(field), str) else ''
            data[field] = get_translated(translations, field, lang, fallback)
        raw_benefits = get_locale_block(translations, lang).get('benefits')
        if raw_benefits is not None and 'benefits' not in data:
            data['benefits'] = raw_benefits if isinstance(raw_benefits, list) else []
        return data


class PortfolioProjectSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description', 'role']
    thumbnail_url = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()

    class Meta:
        model = PortfolioProject
        fields = [
            'id', 'category', 'category_label', 'slug', 'thumbnail_url', 'video_url', 'external_url',
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

    def get_category_label(self, obj: PortfolioProject) -> str:
        request = self.context.get('request')
        lang = normalize_locale(request.query_params.get('lang') if request else None)
        return portfolio_category_label(obj.category, lang)


class ServiceSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = [
        'title', 'description', 'short_description', 'full_description',
        'cta_text', 'cta_link', 'seo_title', 'seo_description',
    ]
    image_url = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'slug', 'icon', 'category', 'image_url', 'order',
            'is_active', 'is_featured', 'features', 'translations',
        ]

    def get_image_url(self, obj: Service) -> str | None:
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def get_features(self, obj: Service) -> list:
        request = self.context.get('request')
        lang = normalize_locale(request.query_params.get('lang') if request else None)
        raw = get_locale_block(obj.translations or {}, lang).get('features')
        return raw if isinstance(raw, list) else []


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
    features = serializers.SerializerMethodField()

    class Meta:
        model = ZendaContent
        fields = [
            'id', 'app_store_url', 'play_store_url', 'monthly_price_kz',
            'screenshots', 'benefits', 'features', 'translations',
        ]

    def get_features(self, obj: ZendaContent) -> list:
        qs = obj.features.filter(is_active=True)
        return ZendaFeatureSerializer(qs, many=True, context=self.context).data

    def get_screenshots(self, obj: ZendaContent) -> list:
        qs = obj.screenshots.filter(is_published=True)
        return ZendaScreenshotSerializer(qs, many=True, context=self.context).data

    def get_benefits(self, obj: ZendaContent) -> list:
        request = self.context.get('request')
        lang = normalize_locale(request.query_params.get('lang') if request else None)
        raw = get_locale_block(obj.translations or {}, lang).get('benefits')
        return raw if isinstance(raw, list) else []

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if 'benefits' not in data or not data['benefits']:
            request = self.context.get('request')
            lang = normalize_locale(request.query_params.get('lang') if request else None)
            raw = get_locale_block(instance.translations or {}, lang).get('benefits')
            data['benefits'] = raw if isinstance(raw, list) else []
        return data


class HomeSectionSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'subtitle', 'body', 'cta_label', 'badge']

    class Meta:
        model = HomeSection
        fields = ['id', 'section_key', 'is_active', 'extra_data', 'translations']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        lang = normalize_locale(request.query_params.get('lang') if request else None)
        block = get_locale_block(instance.translations or {}, lang)
        block_extra = block.get('extra_data')
        if isinstance(block_extra, dict):
            data['extra_data'] = {**(data.get('extra_data') or {}), **block_extra}
        for key in ('roles', 'ctas', 'trust_items', 'cards', 'category_labels'):
            if key in block:
                data[key] = block[key]
        return data


class SiteSettingsSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = [
        'brand_name', 'brand_tagline', 'footer_description', 'footer_rights',
        'contact_label', 'contact_title', 'contact_subtitle',
        'footer_navigation', 'footer_contact',
        'play_store_label', 'app_store_label', 'what_is_label', 'who_label',
        'newsletter_placeholder', 'newsletter_success', 'newsletter_error', 'newsletter_note',
    ]
    og_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = [
            'id', 'contact_email', 'whatsapp_number', 'phone',
            'instagram_url', 'linkedin_url', 'youtube_url', 'tiktok_url',
            'calendly_url', 'og_image_url', 'translations',
        ]

    def get_og_image_url(self, obj: SiteSettings) -> str | None:
        if obj.og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.og_image.url)
            return obj.og_image.url
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        lang = normalize_locale(request.query_params.get('lang') if request else None)
        block = get_locale_block(instance.translations or {}, lang)
        if isinstance(block.get('contact_form'), dict):
            data['contact_form'] = block['contact_form']
        return data


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = [
            'id', 'name', 'email', 'phone', 'subject', 'message',
            'service_interest', 'budget_range', 'project_type', 'source_page',
            'locale', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        return ContactMessage.objects.create(**validated_data)


class ContactMessageAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = '__all__'


class NavItemSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['label']

    class Meta:
        model = NavItem
        fields = ['id', 'url', 'order', 'placement', 'open_in_new_tab', 'is_active', 'translations']


class FAQSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['question', 'answer']

    class Meta:
        model = FAQ
        fields = ['id', 'category', 'order', 'is_active', 'translations']


class ResourceSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description', 'seo_title', 'seo_description']
    thumbnail_url = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Resource
        fields = [
            'id', 'slug', 'resource_type', 'category', 'thumbnail_url', 'file_url',
            'video_url', 'is_featured', 'is_published', 'order', 'translations',
        ]

    def get_thumbnail_url(self, obj: Resource) -> str | None:
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None

    def get_file_url(self, obj: Resource) -> str | None:
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class HomepageStatisticSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['label']

    class Meta:
        model = HomepageStatistic
        fields = ['id', 'value', 'icon', 'order', 'is_active', 'translations']


class ZendaFeatureSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description']
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ZendaFeature
        fields = [
            'id', 'icon', 'image_url', 'category', 'order',
            'is_active', 'is_premium', 'translations',
        ]

    def get_image_url(self, obj: ZendaFeature) -> str | None:
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class NewsletterSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['id', 'email', 'locale', 'created_at']
        read_only_fields = ['id', 'created_at']


class PageSEOSerializer(LocalizedSerializerMixin, serializers.ModelSerializer):
    text_fields = ['title', 'description', 'keywords', 'og_title', 'og_description']
    og_image_url = serializers.SerializerMethodField()

    class Meta:
        model = PageSEO
        fields = ['id', 'page_key', 'canonical_path', 'og_image_url', 'translations']

    def get_og_image_url(self, obj: PageSEO) -> str | None:
        if obj.og_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.og_image.url)
            return obj.og_image.url
        return None
