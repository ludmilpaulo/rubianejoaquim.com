from django.contrib import admin
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


@admin.register(PortfolioProject)
class PortfolioProjectAdmin(admin.ModelAdmin):
    list_display = ['slug', 'category', 'client_name', 'is_featured', 'is_published', 'order']
    list_filter = ['category', 'is_featured', 'is_published']
    search_fields = ['slug', 'client_name']
    prepopulated_fields = {'slug': ('client_name',)}


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['id', 'icon', 'order', 'is_active']
    list_editable = ['order', 'is_active']


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['client_name', 'client_company', 'rating', 'is_published', 'order']
    list_editable = ['is_published', 'order']


@admin.register(ShowreelVideo)
class ShowreelVideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_primary', 'is_published', 'order']
    list_editable = ['is_primary', 'is_published', 'order']


@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ['client_name', 'slug', 'is_published', 'order']
    prepopulated_fields = {'slug': ('client_name',)}


class ZendaScreenshotInline(admin.TabularInline):
    model = ZendaScreenshot
    extra = 1


@admin.register(ZendaContent)
class ZendaContentAdmin(admin.ModelAdmin):
    inlines = [ZendaScreenshotInline]


@admin.register(ZendaScreenshot)
class ZendaScreenshotAdmin(admin.ModelAdmin):
    list_display = ['caption', 'order', 'is_published']
    list_editable = ['order', 'is_published']


@admin.register(HomeSection)
class HomeSectionAdmin(admin.ModelAdmin):
    list_display = ['section_key', 'is_active']
    list_editable = ['is_active']


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ['contact_email', 'whatsapp_number', 'updated_at']


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'status', 'created_at']
    list_filter = ['status', 'locale']
    readonly_fields = ['created_at']
    list_editable = ['status']
