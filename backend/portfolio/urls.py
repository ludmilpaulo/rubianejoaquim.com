from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, admin_views

router = DefaultRouter()
router.register(r'projects', views.PortfolioProjectViewSet, basename='portfolio-project')
router.register(r'services', views.ServiceViewSet, basename='portfolio-service')
router.register(r'testimonials', views.TestimonialViewSet, basename='portfolio-testimonial')
router.register(r'showreel', views.ShowreelVideoViewSet, basename='portfolio-showreel')
router.register(r'case-studies', views.CaseStudyViewSet, basename='portfolio-case-study')
router.register(r'zenda', views.ZendaContentViewSet, basename='portfolio-zenda')
router.register(r'home-sections', views.HomeSectionViewSet, basename='portfolio-home-section')
router.register(r'settings', views.SiteSettingsViewSet, basename='portfolio-settings')
router.register(r'site-settings', views.SiteSettingsViewSet, basename='portfolio-site-settings')
router.register(r'contact', views.ContactMessageViewSet, basename='portfolio-contact')
router.register(r'home', views.PortfolioHomeViewSet, basename='portfolio-home')
router.register(r'homepage', views.PortfolioHomeViewSet, basename='portfolio-homepage')
router.register(r'navigation', views.NavItemViewSet, basename='portfolio-navigation')
router.register(r'faqs', views.FAQViewSet, basename='portfolio-faq')
router.register(r'resources', views.ResourceViewSet, basename='portfolio-resource')
router.register(r'statistics', views.HomepageStatisticViewSet, basename='portfolio-statistic')
router.register(r'page-seo', views.PageSEOViewSet, basename='portfolio-page-seo')
router.register(r'newsletter', views.NewsletterViewSet, basename='portfolio-newsletter')

admin_router = DefaultRouter()
admin_router.register(r'projects', admin_views.AdminPortfolioProjectViewSet, basename='admin-portfolio-project')
admin_router.register(r'services', admin_views.AdminServiceViewSet, basename='admin-portfolio-service')
admin_router.register(r'testimonials', admin_views.AdminTestimonialViewSet, basename='admin-portfolio-testimonial')
admin_router.register(r'showreel', admin_views.AdminShowreelVideoViewSet, basename='admin-portfolio-showreel')
admin_router.register(r'case-studies', admin_views.AdminCaseStudyViewSet, basename='admin-portfolio-case-study')
admin_router.register(r'zenda', admin_views.AdminZendaContentViewSet, basename='admin-portfolio-zenda')
admin_router.register(r'zenda-screenshots', admin_views.AdminZendaScreenshotViewSet, basename='admin-zenda-screenshot')
admin_router.register(r'home-sections', admin_views.AdminHomeSectionViewSet, basename='admin-portfolio-home-section')
admin_router.register(r'settings', admin_views.AdminSiteSettingsViewSet, basename='admin-portfolio-settings')
admin_router.register(r'contact-messages', admin_views.AdminContactMessageViewSet, basename='admin-contact-message')
admin_router.register(r'navigation', admin_views.AdminNavItemViewSet, basename='admin-navigation')
admin_router.register(r'faqs', admin_views.AdminFAQViewSet, basename='admin-faq')
admin_router.register(r'resources', admin_views.AdminResourceViewSet, basename='admin-resource')
admin_router.register(r'statistics', admin_views.AdminHomepageStatisticViewSet, basename='admin-statistic')
admin_router.register(r'zenda-features', admin_views.AdminZendaFeatureViewSet, basename='admin-zenda-feature')
admin_router.register(r'newsletter', admin_views.AdminNewsletterViewSet, basename='admin-newsletter')
admin_router.register(r'page-seo', admin_views.AdminPageSEOViewSet, basename='admin-page-seo')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
]
