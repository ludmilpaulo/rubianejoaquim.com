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
)


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
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]


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
            return Response({})
        serializer = ZendaContentSerializer(content, context={'request': request})
        return Response(serializer.data)


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


class PortfolioHomeViewSet(viewsets.ViewSet):
    """Aggregated homepage payload for a single request."""
    permission_classes = [AllowAny]

    def list(self, request):
        ctx = {'request': request}
        return Response({
            'sections': HomeSectionSerializer(
                HomeSection.objects.filter(is_active=True), many=True, context=ctx
            ).data,
            'services': ServiceSerializer(
                Service.objects.filter(is_active=True), many=True, context=ctx
            ).data,
            'featured_projects': PortfolioProjectSerializer(
                PortfolioProject.objects.filter(is_published=True, is_featured=True)[:6],
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
            'zenda': (
                ZendaContentSerializer(
                    zenda_obj,
                    context=ctx,
                ).data
                if (zenda_obj := ZendaContent.objects.filter(is_active=True).first())
                else {}
            ),
            'settings': SiteSettingsSerializer(
                SiteSettings.objects.first(), context=ctx
            ).data if SiteSettings.objects.exists() else {},
        })
