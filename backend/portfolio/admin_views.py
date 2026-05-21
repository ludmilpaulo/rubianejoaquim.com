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
    include_translations = True

    class Meta(PortfolioProjectSerializer.Meta):
        read_only_fields = ['created_at', 'updated_at']


class AdminServiceSerializer(ServiceSerializer):
    include_translations = True


class AdminTestimonialSerializer(TestimonialSerializer):
    include_translations = True


class AdminShowreelVideoSerializer(ShowreelVideoSerializer):
    include_translations = True


class AdminCaseStudySerializer(CaseStudySerializer):
    include_translations = True


class AdminZendaContentSerializer(ZendaContentSerializer):
    include_translations = True


class AdminHomeSectionSerializer(HomeSectionSerializer):
    include_translations = True


class AdminSiteSettingsSerializer(SiteSettingsSerializer):
    include_translations = True


class AdminNavItemSerializer(NavItemSerializer):
    include_translations = True


class AdminFAQSerializer(FAQSerializer):
    include_translations = True


class AdminResourceSerializer(ResourceSerializer):
    include_translations = True


class AdminHomepageStatisticSerializer(HomepageStatisticSerializer):
    include_translations = True


class AdminZendaFeatureSerializer(ZendaFeatureSerializer):
    include_translations = True


class AdminPageSEOSerializer(PageSEOSerializer):
    include_translations = True


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
    serializer_class = AdminServiceSerializer
    permission_classes = [IsAdminUser]


class AdminTestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = AdminTestimonialSerializer
    permission_classes = [IsAdminUser]


class AdminShowreelVideoViewSet(viewsets.ModelViewSet):
    queryset = ShowreelVideo.objects.all()
    serializer_class = AdminShowreelVideoSerializer
    permission_classes = [IsAdminUser]


class AdminCaseStudyViewSet(viewsets.ModelViewSet):
    queryset = CaseStudy.objects.all()
    serializer_class = AdminCaseStudySerializer
    permission_classes = [IsAdminUser]


class AdminZendaContentViewSet(viewsets.ModelViewSet):
    queryset = ZendaContent.objects.all()
    serializer_class = AdminZendaContentSerializer
    permission_classes = [IsAdminUser]


class AdminZendaScreenshotViewSet(viewsets.ModelViewSet):
    queryset = ZendaScreenshot.objects.all()
    serializer_class = AdminZendaScreenshotSerializer
    permission_classes = [IsAdminUser]


class AdminHomeSectionViewSet(viewsets.ModelViewSet):
    queryset = HomeSection.objects.all()
    serializer_class = AdminHomeSectionSerializer
    permission_classes = [IsAdminUser]


class AdminSiteSettingsViewSet(viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = AdminSiteSettingsSerializer
    permission_classes = [IsAdminUser]


class AdminContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageAdminSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['get', 'head', 'options', 'patch', 'put', 'delete']


class AdminNavItemViewSet(viewsets.ModelViewSet):
    queryset = NavItem.objects.all()
    serializer_class = AdminNavItemSerializer
    permission_classes = [IsAdminUser]


class AdminFAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = AdminFAQSerializer
    permission_classes = [IsAdminUser]


class AdminResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = AdminResourceSerializer
    permission_classes = [IsAdminUser]


class AdminHomepageStatisticViewSet(viewsets.ModelViewSet):
    queryset = HomepageStatistic.objects.all()
    serializer_class = AdminHomepageStatisticSerializer
    permission_classes = [IsAdminUser]


class AdminZendaFeatureViewSet(viewsets.ModelViewSet):
    queryset = ZendaFeature.objects.all()
    serializer_class = AdminZendaFeatureSerializer
    permission_classes = [IsAdminUser]


class AdminNewsletterViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NewsletterSubscriber.objects.all()
    serializer_class = NewsletterSubscriberSerializer
    permission_classes = [IsAdminUser]


class AdminPageSEOViewSet(viewsets.ModelViewSet):
    queryset = PageSEO.objects.all()
    serializer_class = AdminPageSEOSerializer
    permission_classes = [IsAdminUser]
