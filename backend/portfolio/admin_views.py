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
from .serializers import (
    PortfolioProjectSerializer,
    ServiceSerializer,
    TestimonialSerializer,
    ShowreelVideoSerializer,
    CaseStudySerializer,
    ZendaContentSerializer,
    ZendaFeatureSerializer,
    HomeSectionSerializer,
    SiteSettingsSerializer,
    ContactMessageAdminSerializer,
    NavItemSerializer,
    FAQSerializer,
    ResourceSerializer,
    HomepageStatisticSerializer,
    NewsletterSubscriberSerializer,
    PageSEOSerializer,
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


class AdminNavItemViewSet(viewsets.ModelViewSet):
    queryset = NavItem.objects.all()
    serializer_class = NavItemSerializer
    permission_classes = [IsAdminUser]


class AdminFAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [IsAdminUser]


class AdminResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAdminUser]


class AdminHomepageStatisticViewSet(viewsets.ModelViewSet):
    queryset = HomepageStatistic.objects.all()
    serializer_class = HomepageStatisticSerializer
    permission_classes = [IsAdminUser]


class AdminZendaFeatureViewSet(viewsets.ModelViewSet):
    queryset = ZendaFeature.objects.all()
    serializer_class = ZendaFeatureSerializer
    permission_classes = [IsAdminUser]


class AdminNewsletterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NewsletterSubscriber.objects.all()
    serializer_class = NewsletterSubscriberSerializer
    permission_classes = [IsAdminUser]


class AdminPageSEOViewSet(viewsets.ModelViewSet):
    queryset = PageSEO.objects.all()
    serializer_class = PageSEOSerializer
    permission_classes = [IsAdminUser]
