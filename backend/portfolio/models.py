from django.db import models


class PortfolioCategory(models.TextChoices):
    CAMPAIGN_VIDEOS = 'campaign_videos', 'Campaign Videos'
    INTERVIEWS = 'interviews', 'Interviews'
    SOCIAL_REELS = 'social_reels', 'Social Media Reels'
    CANVA_DESIGNS = 'canva_designs', 'Canva Designs'
    SCRIPTWRITING = 'scriptwriting', 'Scriptwriting / Roteiros'
    ZENDA_CONTENT = 'zenda_content', 'Zenda Product Content'


class PortfolioProject(models.Model):
    """Portfolio work item managed via admin."""
    category = models.CharField(max_length=32, choices=PortfolioCategory.choices)
    slug = models.SlugField(max_length=120, unique=True)
    thumbnail = models.ImageField(upload_to='portfolio/thumbnails/', blank=True, null=True)
    video_url = models.URLField(blank=True, help_text='YouTube or embed URL')
    external_url = models.URLField(blank=True)
    client_name = models.CharField(max_length=200, blank=True)
    tools_used = models.CharField(max_length=500, blank=True)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    translations = models.JSONField(
        default=dict,
        help_text='{"pt": {"title": "", "description": "", "role": ""}, "en": {...}}',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = 'Portfolio Project'
        verbose_name_plural = 'Portfolio Projects'

    def __str__(self) -> str:
        title = (self.translations or {}).get('pt', {}).get('title', self.slug)
        return str(title)


class Service(models.Model):
    """Creative services offered by Rubiane."""
    slug = models.SlugField(max_length=120, blank=True, db_index=True)
    icon = models.CharField(max_length=64, default='video', help_text='Icon key: video, script, interview, etc.')
    category = models.CharField(max_length=64, blank=True)
    image = models.ImageField(upload_to='portfolio/services/', blank=True, null=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    translations = models.JSONField(
        default=dict,
        help_text='title, description, short_description, full_description, features[], cta_text, cta_link, seo_title, seo_description',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = 'Service'
        verbose_name_plural = 'Services'

    def __str__(self) -> str:
        title = (self.translations or {}).get('pt', {}).get('title', f'Service {self.pk}')
        return str(title)


class Testimonial(models.Model):
    client_name = models.CharField(max_length=200)
    client_role = models.CharField(max_length=200, blank=True)
    client_company = models.CharField(max_length=200, blank=True)
    avatar = models.ImageField(upload_to='portfolio/testimonials/', blank=True, null=True)
    rating = models.PositiveSmallIntegerField(default=5)
    order = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)
    translations = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self) -> str:
        return self.client_name


class ShowreelVideo(models.Model):
    title = models.CharField(max_length=200, blank=True)
    youtube_url = models.URLField()
    is_primary = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    translations = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', 'order']

    def __str__(self) -> str:
        return self.title or self.youtube_url


class CaseStudy(models.Model):
    slug = models.SlugField(max_length=120, unique=True)
    client_name = models.CharField(max_length=200)
    image = models.ImageField(upload_to='portfolio/case-studies/', blank=True, null=True)
    tools_used = models.CharField(max_length=500, blank=True)
    order = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)
    translations = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name_plural = 'Case Studies'

    def __str__(self) -> str:
        return self.client_name


class ZendaContent(models.Model):
    """Singleton-style Zenda product section content."""
    app_store_url = models.URLField(blank=True)
    play_store_url = models.URLField(blank=True)
    monthly_price_kz = models.DecimalField(max_digits=12, decimal_places=2, default=10000)
    is_active = models.BooleanField(default=True)
    translations = models.JSONField(
        default=dict,
        help_text='Headlines, benefits list, who it helps, etc. per locale',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Zenda Content'
        verbose_name_plural = 'Zenda Content'

    def __str__(self) -> str:
        return 'Zenda Product Content'


class ZendaScreenshot(models.Model):
    zenda_content = models.ForeignKey(
        ZendaContent,
        related_name='screenshots',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    image = models.ImageField(upload_to='portfolio/zenda/')
    caption = models.CharField(max_length=200, blank=True)
    order = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']

    def __str__(self) -> str:
        return self.caption or f'Zenda screenshot {self.pk}'


class HomeSection(models.Model):
    """CMS blocks for homepage sections."""
    SECTION_KEYS = [
        ('hero', 'Hero'),
        ('about', 'About'),
        ('services_intro', 'Services Intro'),
        ('portfolio_intro', 'Portfolio Intro'),
        ('showreel', 'Showreel'),
        ('zenda', 'Zenda'),
        ('case_studies_intro', 'Case Studies Intro'),
        ('testimonials_intro', 'Testimonials Intro'),
        ('education', 'Education'),
        ('final_cta', 'Final CTA'),
        ('statistics', 'Statistics'),
        ('cta', 'Call to Action'),
    ]
    section_key = models.CharField(max_length=64, choices=SECTION_KEYS, unique=True)
    is_active = models.BooleanField(default=True)
    extra_data = models.JSONField(default=dict, blank=True)
    translations = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Homepage Section'
        verbose_name_plural = 'Homepage Sections'

    def __str__(self) -> str:
        return self.get_section_key_display()


class SiteSettings(models.Model):
    """Global contact and social settings."""
    contact_email = models.EmailField(default='contacto@rubianejoaquim.com')
    whatsapp_number = models.CharField(max_length=32, default='244944905246')
    phone = models.CharField(max_length=32, default='+244 944 905246')
    instagram_url = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)
    calendly_url = models.URLField(blank=True)
    og_image = models.ImageField(upload_to='portfolio/og/', blank=True, null=True)
    translations = models.JSONField(
        default=dict,
        help_text='brand_tagline, footer_description, footer_rights per locale',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def __str__(self) -> str:
        return 'Site Settings'


class ContactMessage(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('in_progress', 'In Progress'),
        ('converted', 'Converted'),
        ('lost', 'Lost'),
        ('spam', 'Spam'),
        ('read', 'Read'),
        ('replied', 'Replied'),
        ('archived', 'Archived'),
    ]
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    subject = models.CharField(max_length=300)
    message = models.TextField()
    service_interest = models.CharField(max_length=200, blank=True)
    budget_range = models.CharField(max_length=100, blank=True)
    project_type = models.CharField(max_length=100, blank=True)
    source_page = models.CharField(max_length=300, blank=True)
    assigned_to = models.CharField(max_length=200, blank=True)
    admin_notes = models.TextField(blank=True)
    locale = models.CharField(max_length=5, default='pt')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.name} — {self.subject}'


class NavItem(models.Model):
    PLACEMENT_CHOICES = [
        ('header', 'Header'),
        ('footer', 'Footer'),
        ('both', 'Header & Footer'),
    ]
    url = models.CharField(max_length=500)
    order = models.IntegerField(default=0)
    placement = models.CharField(max_length=16, choices=PLACEMENT_CHOICES, default='both')
    open_in_new_tab = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    translations = models.JSONField(default=dict, help_text='{"pt": {"label": "..."}}')

    class Meta:
        ordering = ['order']

    def __str__(self) -> str:
        return self.url


class FAQ(models.Model):
    CATEGORY_CHOICES = [
        ('services', 'Services'),
        ('portfolio', 'Portfolio'),
        ('courses', 'Courses'),
        ('mentorship', 'Mentorship'),
        ('zenda', 'Zenda'),
        ('payments', 'Payments'),
        ('support', 'Support'),
        ('general', 'General'),
    ]
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='general')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    translations = models.JSONField(default=dict, help_text='question, answer per locale')

    class Meta:
        ordering = ['category', 'order']
        verbose_name = 'FAQ'

    def __str__(self) -> str:
        return f'{self.category} #{self.pk}'


class Resource(models.Model):
    TYPE_CHOICES = [
        ('video', 'Video'),
        ('pdf', 'PDF'),
        ('article', 'Article'),
        ('template', 'Template'),
        ('guide', 'Guide'),
    ]
    slug = models.SlugField(max_length=120, unique=True)
    resource_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='article')
    category = models.CharField(max_length=64, blank=True)
    thumbnail = models.ImageField(upload_to='portfolio/resources/', blank=True, null=True)
    file = models.FileField(upload_to='portfolio/resources/files/', blank=True, null=True)
    video_url = models.URLField(blank=True)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    translations = models.JSONField(default=dict, help_text='title, description, seo_title, seo_description')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self) -> str:
        return self.slug


class HomepageStatistic(models.Model):
    value = models.CharField(max_length=64)
    icon = models.CharField(max_length=32, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    translations = models.JSONField(default=dict, help_text='label per locale')

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Homepage statistics'

    def __str__(self) -> str:
        return self.value


class ZendaFeature(models.Model):
    CATEGORY_CHOICES = [
        ('personal_finance', 'Personal Finance'),
        ('business_finance', 'Business Finance'),
        ('ai_copilot', 'AI Financial Copilot'),
        ('currency', 'Currency Converter'),
        ('education', 'Education'),
        ('goals', 'Goals'),
        ('tasks', 'Tasks'),
        ('subscriptions', 'Subscriptions'),
        ('notifications', 'Notifications'),
        ('reports', 'Reports'),
        ('security', 'Security'),
        ('offline', 'Offline Mode'),
    ]
    zenda_content = models.ForeignKey(
        ZendaContent, related_name='features', on_delete=models.CASCADE, null=True, blank=True
    )
    icon = models.CharField(max_length=64, blank=True)
    image = models.ImageField(upload_to='portfolio/zenda/features/', blank=True, null=True)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='personal_finance')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_premium = models.BooleanField(default=False)
    translations = models.JSONField(default=dict, help_text='title, description')

    class Meta:
        ordering = ['order']

    def __str__(self) -> str:
        return f'{self.category} feature {self.pk}'


class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    locale = models.CharField(max_length=5, default='pt')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self) -> str:
        return self.email


class PageSEO(models.Model):
    page_key = models.SlugField(max_length=64, unique=True, help_text='home, zenda, portfolio, contact, etc.')
    canonical_path = models.CharField(max_length=200, blank=True)
    og_image = models.ImageField(upload_to='portfolio/og/pages/', blank=True, null=True)
    translations = models.JSONField(
        default=dict,
        help_text='title, description, keywords, og_title, og_description per locale',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Page SEO'
        verbose_name_plural = 'Page SEO'

    def __str__(self) -> str:
        return self.page_key
