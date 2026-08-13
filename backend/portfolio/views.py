from rest_framework import viewsets, status
from rest_framework.mixins import CreateModelMixin
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings

from .models import (
    PortfolioProject,
    Service,
    Testimonial,
    ShowreelVideo,
    CaseStudy,
    ZendaContent,
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
from .serializers import (
    PortfolioProjectSerializer,
    ServiceSerializer,
    TestimonialSerializer,
    ShowreelVideoSerializer,
    CaseStudySerializer,
    ZendaContentSerializer,
    HomeSectionSerializer,
    SiteSettingsSerializer,
    ContactMessageSerializer,
    ContactMessageAdminSerializer,
    NavItemSerializer,
    FAQSerializer,
    ResourceSerializer,
    HomepageStatisticSerializer,
    NewsletterSubscriberSerializer,
    PageSEOSerializer,
)
from .cms_defaults import apply_homepage_defaults, default_navigation


class PortfolioProjectViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PortfolioProjectSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = PortfolioProject.objects.filter(is_published=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        featured = self.request.query_params.get('featured')
        if featured == 'true':
            qs = qs.filter(is_featured=True)
        return qs


class ServiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Service.objects.filter(is_active=True)
        featured = self.request.query_params.get('featured')
        if featured == 'true':
            qs = qs.filter(is_featured=True)
        return qs


class TestimonialViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Testimonial.objects.filter(is_published=True)
    serializer_class = TestimonialSerializer
    permission_classes = [AllowAny]


class ShowreelVideoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ShowreelVideo.objects.filter(is_published=True)
    serializer_class = ShowreelVideoSerializer
    permission_classes = [AllowAny]


class CaseStudyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CaseStudy.objects.filter(is_published=True)
    serializer_class = CaseStudySerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'


class ZendaContentViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        content = ZendaContent.objects.filter(is_active=True).first()
        if not content:
            return Response({
                'headline': 'Zenda',
                'subheadline': 'One app. Your money. Your life. Your business.',
                'what_is': 'Download Zenda and manage your finances, money, business and more.',
                'who_it_helps': 'Individuals, families and small businesses.',
                'benefits': [
                    'Salary and budgets',
                    'Expenses and debts',
                    'Savings and goals',
                    'Business finance',
                ],
                'features': [],
                'screenshots': [],
                'app_store_url': settings.APP_STORE_URL_IOS,
                'play_store_url': settings.APP_STORE_URL_ANDROID,
                'monthly_price_kz': '10000',
            })
        serializer = ZendaContentSerializer(content, context={'request': request})
        data = serializer.data
        if not data.get('app_store_url'):
            data['app_store_url'] = settings.APP_STORE_URL_IOS
        if not data.get('play_store_url'):
            data['play_store_url'] = settings.APP_STORE_URL_ANDROID
        return Response(data)


class HomeSectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HomeSection.objects.filter(is_active=True)
    serializer_class = HomeSectionSerializer
    permission_classes = [AllowAny]


class SiteSettingsViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        settings_obj = SiteSettings.objects.first()
        if not settings_obj:
            return Response({
                'contact_email': 'contacto@rubianejoaquim.com',
                'whatsapp_number': '244944905246',
                'phone': '+244 944 905246',
            })
        serializer = SiteSettingsSerializer(settings_obj, context={'request': request})
        return Response(serializer.data)


class ContactMessageViewSet(CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = ContactMessageSerializer
    permission_classes = [AllowAny]
    http_method_names = ['post', 'options', 'head']

    def create(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()

        try:
            send_mail(
                subject=f'[Portfolio] {message.subject}',
                message=(
                    f'Name: {message.name}\n'
                    f'Email: {message.email}\n'
                    f'Phone: {message.phone}\n\n'
                    f'{message.message}'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings_obj_email()],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response(serializer.data, status=status.HTTP_201_CREATED)


def settings_obj_email() -> str:
    obj = SiteSettings.objects.first()
    return obj.contact_email if obj else 'contacto@rubianejoaquim.com'


class NavItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NavItem.objects.filter(is_active=True)
    serializer_class = NavItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = NavItem.objects.filter(is_active=True)
        placement = self.request.query_params.get('placement')
        if placement:
            qs = qs.filter(placement__in=[placement, 'both'])
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        placement = request.query_params.get('placement')
        lang = request.query_params.get('lang')
        return Response(default_navigation(lang, placement))


class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FAQ.objects.filter(is_active=True)
    serializer_class = FAQSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = FAQ.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class ResourceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        qs = Resource.objects.filter(is_published=True)
        featured = self.request.query_params.get('featured')
        if featured == 'true':
            qs = qs.filter(is_featured=True)
        return qs


class HomepageStatisticViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HomepageStatistic.objects.filter(is_active=True)
    serializer_class = HomepageStatisticSerializer
    permission_classes = [AllowAny]


class PageSEOViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PageSEO.objects.all()
    serializer_class = PageSEOSerializer
    permission_classes = [AllowAny]
    lookup_field = 'page_key'


class NewsletterViewSet(viewsets.GenericViewSet, CreateModelMixin):
    serializer_class = NewsletterSubscriberSerializer
    permission_classes = [AllowAny]
    http_method_names = ['post', 'options', 'head']

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'email': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)
        locale = request.data.get('locale', 'pt')
        obj, _created = NewsletterSubscriber.objects.update_or_create(
            email=email,
            defaults={'locale': locale, 'is_active': True},
        )
        serializer = self.get_serializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PortfolioHomeViewSet(viewsets.ViewSet):
    """Aggregated homepage payload for a single request."""
    permission_classes = [AllowAny]

    def list(self, request):
        ctx = {'request': request}
        lang = request.query_params.get('lang')
        all_sections = HomeSection.objects.all()
        section_visibility = {
            s.section_key: s.is_active for s in all_sections
        }
        active_sections = all_sections.filter(is_active=True)
        payload = {
            'sections': HomeSectionSerializer(active_sections, many=True, context=ctx).data,
            'section_visibility': section_visibility,
            'services': ServiceSerializer(
                Service.objects.filter(is_active=True), many=True, context=ctx
            ).data,
            'featured_projects': PortfolioProjectSerializer(
                PortfolioProject.objects.filter(is_published=True, is_featured=True)[:12],
                many=True,
                context=ctx,
            ).data,
            'showreel': ShowreelVideoSerializer(
                ShowreelVideo.objects.filter(is_published=True), many=True, context=ctx
            ).data,
            'testimonials': TestimonialSerializer(
                Testimonial.objects.filter(is_published=True)[:6], many=True, context=ctx
            ).data,
            'case_studies': CaseStudySerializer(
                CaseStudy.objects.filter(is_published=True)[:6], many=True, context=ctx
            ).data,
            'statistics': HomepageStatisticSerializer(
                HomepageStatistic.objects.filter(is_active=True), many=True, context=ctx
            ).data,
            'resources': ResourceSerializer(
                Resource.objects.filter(is_published=True, is_featured=True)[:6],
                many=True,
                context=ctx,
            ).data,
            'navigation': NavItemSerializer(
                NavItem.objects.filter(is_active=True), many=True, context=ctx
            ).data,
            'faqs': FAQSerializer(
                FAQ.objects.filter(is_active=True)[:12], many=True, context=ctx
            ).data,
            'zenda': (
                ZendaContentSerializer(zenda_obj, context=ctx).data
                if (zenda_obj := ZendaContent.objects.filter(is_active=True).first())
                else {
                    'headline': 'Zenda',
                    'subheadline': 'One app. Your money. Your life. Your business.',
                    'app_store_url': settings.APP_STORE_URL_IOS,
                    'play_store_url': settings.APP_STORE_URL_ANDROID,
                    'benefits': [],
                    'features': [],
                    'screenshots': [],
                }
            ),
            'settings': (
                SiteSettingsSerializer(SiteSettings.objects.first(), context=ctx).data
                if SiteSettings.objects.exists()
                else {}
            ),
            'seo': (
                PageSEOSerializer(PageSEO.objects.filter(page_key='home').first(), context=ctx).data
                if PageSEO.objects.filter(page_key='home').exists()
                else {}
            ),
        }
        return Response(apply_homepage_defaults(payload, lang))
