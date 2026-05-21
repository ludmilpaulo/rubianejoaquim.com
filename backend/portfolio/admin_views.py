from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser

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
from .serializers import (
    PortfolioProjectSerializer,
    ServiceSerializer,
    TestimonialSerializer,
    ShowreelVideoSerializer,
    CaseStudySerializer,
    ZendaContentSerializer,
    HomeSectionSerializer,
    SiteSettingsSerializer,
    ContactMessageAdminSerializer,
)
from rest_framework import serializers


class AdminPortfolioProjectSerializer(PortfolioProjectSerializer):
    class Meta(PortfolioProjectSerializer.Meta):
        read_only_fields = ['created_at', 'updated_at']


class AdminZendaScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZendaScreenshot
        fields = '__all__'


class AdminPortfolioProjectViewSet(viewsets.ModelViewSet):
    queryset = PortfolioProject.objects.all()
    serializer_class = AdminPortfolioProjectSerializer
    permission_classes = [IsAdminUser]


class AdminServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminUser]


class AdminTestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    permission_classes = [IsAdminUser]


class AdminShowreelVideoViewSet(viewsets.ModelViewSet):
    queryset = ShowreelVideo.objects.all()
    serializer_class = ShowreelVideoSerializer
    permission_classes = [IsAdminUser]


class AdminCaseStudyViewSet(viewsets.ModelViewSet):
    queryset = CaseStudy.objects.all()
    serializer_class = CaseStudySerializer
    permission_classes = [IsAdminUser]


class AdminZendaContentViewSet(viewsets.ModelViewSet):
    queryset = ZendaContent.objects.all()
    serializer_class = ZendaContentSerializer
    permission_classes = [IsAdminUser]


class AdminZendaScreenshotViewSet(viewsets.ModelViewSet):
    queryset = ZendaScreenshot.objects.all()
    serializer_class = AdminZendaScreenshotSerializer
    permission_classes = [IsAdminUser]


class AdminHomeSectionViewSet(viewsets.ModelViewSet):
    queryset = HomeSection.objects.all()
    serializer_class = HomeSectionSerializer
    permission_classes = [IsAdminUser]


class AdminSiteSettingsViewSet(viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer
    permission_classes = [IsAdminUser]


class AdminContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageAdminSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'head', 'options', 'patch', 'put', 'delete']
