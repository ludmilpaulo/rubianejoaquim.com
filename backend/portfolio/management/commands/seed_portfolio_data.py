"""Seed portfolio CMS data for Rubiane Joaquim creative platform."""
from django.core.management.base import BaseCommand
from portfolio.models import (
    PortfolioProject,
    Service,
    Testimonial,
    ShowreelVideo,
    CaseStudy,
    ZendaContent,
    ZendaFeature,
    HomeSection,
    SiteSettings,
    NavItem,
    FAQ,
    HomepageStatistic,
    PageSEO,
)


def t(pt, en, fr, es):
    return {'pt': pt, 'en': en, 'fr': fr, 'es': es}


class Command(BaseCommand):
    help = 'Seed portfolio, services, testimonials, and homepage sections'

    def handle(self, *args, **options):
        self._seed_settings()
        self._seed_home_sections()
        self._seed_services()
        self._seed_projects()
        self._seed_showreel()
        self._seed_testimonials()
        self._seed_case_studies()
        self._seed_zenda()
        self._seed_navigation()
        self._seed_statistics()
        self._seed_faqs()
        self._seed_page_seo()
        self._seed_site_translations()
        self.stdout.write(self.style.SUCCESS('Portfolio data seeded successfully.'))

    def _seed_settings(self):
        SiteSettings.objects.get_or_create(
            pk=1,
            defaults={
                'contact_email': 'contacto@rubianejoaquim.com',
                'whatsapp_number': '244944905246',
                'phone': '+244 944 905246',
            },
        )

    def _seed_home_sections(self):
        hero_ctas_pt = [
            {'key': 'showreel', 'label': 'Ver Showreel', 'url': '#showreel', 'variant': 'primary'},
            {'key': 'portfolio', 'label': 'Ver Portfólio', 'url': '/portfolio', 'variant': 'secondary'},
            {'key': 'work', 'label': 'Trabalhar Comigo', 'url': '/contact', 'variant': 'secondary'},
            {'key': 'zenda', 'label': 'Explorar Zenda', 'url': '/zenda', 'variant': 'outline'},
        ]
        hero_ctas_en = [
            {'key': 'showreel', 'label': 'Watch Showreel', 'url': '#showreel', 'variant': 'primary'},
            {'key': 'portfolio', 'label': 'View Portfolio', 'url': '/portfolio', 'variant': 'secondary'},
            {'key': 'work', 'label': 'Work With Me', 'url': '/contact', 'variant': 'secondary'},
            {'key': 'zenda', 'label': 'Explore Zenda', 'url': '/zenda', 'variant': 'outline'},
        ]
        sections = [
            ('hero', {
                'title': t('Produtora de Vídeo Criativo', 'Creative Video Content Producer', 'Productrice de Contenu Vidéo Créatif', 'Productora de Contenido de Video Creativo'),
                'subtitle': t(
                    '& Marketing Campaign Storyteller',
                    '& Marketing Campaign Storyteller',
                    '& narratrice de campagnes marketing',
                    'y narradora de campañas de marketing',
                ),
                'badge': t(
                    'Creative Video · Marketing · Storytelling',
                    'Creative Video · Marketing · Storytelling',
                    'Vidéo créative · Marketing · Storytelling',
                    'Video creativo · Marketing · Storytelling',
                ),
                'body': t(
                    'Ajudo marcas a criar campanhas em vídeo, entrevistas, reels, roteiros e narrativas que conectam com audiências internacionais.',
                    'I help brands create campaign videos, interviews, reels, scripts, and stories that connect with international audiences.',
                    'J\'aide les marques à créer des campagnes vidéo, interviews, reels, scripts et récits pour un public international.',
                    'Ayudo a marcas a crear videos de campaña, entrevistas, reels, guiones e historias para audiencias internacionales.',
                ),
            }),
            ('about', {
                'title': t('Quem é a', 'Meet', 'Qui est', 'Conoce a'),
                'subtitle': t(
                    'Criatividade audiovisual com visão de marketing e produto digital',
                    'Audiovisual creativity with marketing vision and digital product leadership',
                    'Créativité audiovisuelle et vision marketing',
                    'Creatividad audiovisual y visión de marketing',
                ),
                'body': t(
                    'Produtora de conteúdo audiovisual e storyteller de marketing que ajuda marcas a comunicar com clareza, emoção e impacto visual. Do roteiro à edição final.',
                    'Audiovisual producer and marketing storyteller helping brands communicate with clarity, emotion, and visual impact.',
                    'Productrice audiovisuelle et narratrice marketing pour des marques exigeantes.',
                    'Productora audiovisual y narradora de marketing para marcas exigentes.',
                ),
            }),
            ('services_intro', {
                'title': t('O que posso criar para a sua marca', 'What I can create for your brand', 'Ce que je crée pour votre marque', 'Lo que puedo crear para tu marca'),
                'subtitle': t(
                    'Produção criativa completa — da ideia ao vídeo publicado',
                    'Full creative production — from idea to published video',
                    'Production créative complète',
                    'Producción creativa completa',
                ),
            }),
            ('portfolio_intro', {
                'title': t('Trabalhos selecionados', 'Selected work', 'Travaux sélectionnés', 'Trabajos seleccionados'),
                'subtitle': t(
                    'Campanhas, entrevistas, reels, design e conteúdo Zenda',
                    'Campaigns, interviews, reels, design, and Zenda content',
                    'Campagnes, interviews, reels et contenu Zenda',
                    'Campañas, entrevistas, reels y contenido Zenda',
                ),
            }),
            ('showreel', {
                'title': t('Showreel em destaque', 'Featured showreel', 'Showreel en vedette', 'Showreel destacado'),
                'subtitle': t(
                    'Uma amostra do trabalho criativo — campanhas, entrevistas e storytelling',
                    'A sample of creative work — campaigns, interviews, and storytelling',
                    'Un aperçu du travail créatif',
                    'Una muestra del trabajo creativo',
                ),
            }),
            ('zenda', {
                'title': t('Zenda — a sua app de finanças', 'Zenda — your finance app', 'Zenda — votre app finance', 'Zenda — tu app de finanzas'),
                'subtitle': t(
                    'Finanças pessoais, negócio, educação e AI Copilot num só lugar',
                    'Personal finance, business, education, and AI Copilot in one place',
                    'Finances personnelles, business et copilot IA',
                    'Finanzas personales, negocio y copiloto IA',
                ),
                'badge': t('Produto digital · Fintech · Educação', 'Digital product · Fintech · Education', 'Produit digital · Fintech', 'Producto digital · Fintech'),
            }),
            ('case_studies_intro', {
                'title': t('Estudos de caso', 'Case studies', 'Études de cas', 'Casos de estudio'),
                'subtitle': t(
                    'Resultados reais para marcas e projetos',
                    'Real outcomes for brands and projects',
                    'Résultats concrets pour les marques',
                    'Resultados reales para marcas',
                ),
            }),
            ('testimonials_intro', {
                'title': t('O que dizem os clientes', 'What clients say', 'Ce que disent les clients', 'Lo que dicen los clientes'),
                'subtitle': t(
                    'Confiança construída em cada entrega',
                    'Trust built on every delivery',
                    'La confiance à chaque livraison',
                    'Confianza en cada entrega',
                ),
            }),
        ]

        final_cta_pt = [
            {'key': 'whatsapp', 'label': 'WhatsApp', 'url': 'https://wa.me/244944905246', 'variant': 'whatsapp'},
            {'key': 'message', 'label': 'Enviar Mensagem', 'url': '/contact', 'variant': 'primary'},
            {'key': 'call', 'label': 'Marcar Chamada', 'url': '/contact', 'variant': 'secondary'},
        ]
        HomeSection.objects.update_or_create(
            section_key='education',
            defaults={
                'is_active': True,
                'translations': {
                    'pt': {
                        'title': 'Cursos, mentoria e conteúdos grátis',
                        'subtitle': 'Além da produção criativa, Rubiane ensina finanças e empreendedorismo',
                        'cards': [
                            {'title': 'Cursos', 'description': 'Cursos online com certificado.', 'href': '/cursos', 'cta': 'Explorar cursos'},
                            {'title': 'Mentoria', 'description': 'Acompanhamento individual.', 'href': '/mentoria', 'cta': 'Saber mais'},
                            {'title': 'Conteúdos Grátis', 'description': 'Recursos gratuitos.', 'href': '/conteudos-gratis', 'cta': 'Ver conteúdos'},
                        ],
                    },
                    'en': {
                        'title': 'Courses, mentorship & free content',
                        'subtitle': 'Beyond creative production, Rubiane teaches finance and entrepreneurship',
                        'cards': [
                            {'title': 'Courses', 'description': 'Online courses with certificates.', 'href': '/cursos', 'cta': 'Explore courses'},
                            {'title': 'Mentorship', 'description': 'One-on-one guidance.', 'href': '/mentoria', 'cta': 'Learn more'},
                            {'title': 'Free Content', 'description': 'Free resources.', 'href': '/conteudos-gratis', 'cta': 'View content'},
                        ],
                    },
                },
            },
        )
        HomeSection.objects.update_or_create(
            section_key='final_cta',
            defaults={
                'is_active': True,
                'translations': {
                    'pt': {
                        'title': 'Pronto para criar conteúdo poderoso para a sua marca?',
                        'subtitle': 'Campanhas em vídeo, entrevistas, roteiros e conteúdo social — com qualidade internacional.',
                        'ctas': final_cta_pt,
                    },
                    'en': {
                        'title': 'Ready to create powerful content for your brand?',
                        'subtitle': 'Video campaigns, interviews, scripts, and social content — international quality.',
                        'ctas': [
                            {'key': 'whatsapp', 'label': 'WhatsApp', 'url': 'https://wa.me/244944905246', 'variant': 'whatsapp'},
                            {'key': 'message', 'label': 'Send Message', 'url': '/contact', 'variant': 'primary'},
                            {'key': 'call', 'label': 'Book a Call', 'url': '/contact', 'variant': 'secondary'},
                        ],
                    },
                },
            },
        )
        for key, trans in sections:
            HomeSection.objects.update_or_create(
                section_key=key,
                defaults={'is_active': True, 'translations': trans},
            )

        HomeSection.objects.update_or_create(
            section_key='hero',
            defaults={
                'is_active': True,
                'translations': {
                    'pt': {
                        'title': 'Produtora de Vídeo Criativo',
                        'subtitle': '& Marketing Campaign Storyteller',
                        'badge': 'Creative Video · Marketing · Storytelling',
                        'body': 'Ajudo marcas a criar campanhas em vídeo, entrevistas, reels, roteiros e narrativas que conectam com audiências internacionais.',
                        'roles': ['Produtora de Vídeo', 'Roteirista', 'Entrevistas', 'CapCut & Canva', 'Redes Sociais', 'Criadora do Zenda'],
                        'ctas': hero_ctas_pt,
                        'trust_items': ['Campanhas & Entrevistas', 'Roteiros & Edição', 'Criadora do Zenda'],
                    },
                    'en': {
                        'title': 'Creative Video Content Producer',
                        'subtitle': '& Marketing Campaign Storyteller',
                        'badge': 'Creative Video · Marketing · Storytelling',
                        'body': 'I help brands create campaign videos, interviews, reels, scripts, and stories that connect with international audiences.',
                        'roles': ['Video Producer', 'Scriptwriter', 'Interviews', 'CapCut & Canva', 'Social Media', 'Creator of Zenda'],
                        'ctas': hero_ctas_en,
                        'trust_items': ['Campaigns & Interviews', 'Scripts & Editing', 'Creator of Zenda'],
                    },
                    'fr': {
                        'title': 'Productrice de Contenu Vidéo Créatif',
                        'subtitle': '& narratrice de campagnes marketing',
                        'badge': 'Vidéo créative · Marketing · Storytelling',
                        'body': 'J\'aide les marques à créer des campagnes vidéo, interviews, reels, scripts et récits pour un public international.',
                        'roles': ['Productrice vidéo', 'Scénariste', 'Interviews', 'CapCut & Canva', 'Réseaux sociaux', 'Créatrice de Zenda'],
                        'ctas': hero_ctas_en,
                        'trust_items': ['Campagnes & interviews', 'Scripts & montage', 'Créatrice de Zenda'],
                    },
                    'es': {
                        'title': 'Productora de Contenido de Video Creativo',
                        'subtitle': 'y narradora de campañas de marketing',
                        'badge': 'Video creativo · Marketing · Storytelling',
                        'body': 'Ayudo a marcas a crear videos de campaña, entrevistas, reels, guiones e historias para audiencias internacionales.',
                        'roles': ['Productora de video', 'Guionista', 'Entrevistas', 'CapCut y Canva', 'Redes sociales', 'Creadora de Zenda'],
                        'ctas': hero_ctas_en,
                        'trust_items': ['Campañas y entrevistas', 'Guiones y edición', 'Creadora de Zenda'],
                    },
                },
            },
        )

    def _seed_services(self):
        services_data = [
            ('video', 'Marketing campaign content', 'Conteúdo de campanhas de marketing'),
            ('script', 'Scriptwriting / Roteiros', 'Roteiros e copy para vídeo'),
            ('interview', 'Interview planning & production', 'Planeamento e produção de entrevistas'),
            ('capcut', 'CapCut video editing', 'Edição de vídeo com CapCut'),
            ('canva', 'Canva visual content', 'Conteúdo visual com Canva'),
            ('reels', 'Social media reels', 'Reels TikTok / YouTube Shorts'),
            ('story', 'Brand storytelling', 'Storytelling de marca'),
            ('strategy', 'Content strategy', 'Estratégia de conteúdo'),
        ]
        for i, (icon, en_title, pt_title) in enumerate(services_data):
            Service.objects.update_or_create(
                icon=icon,
                defaults={
                    'slug': icon,
                    'order': i,
                    'is_active': True,
                    'is_featured': i < 4,
                    'translations': t(
                        {'title': pt_title, 'description': f'Serviço profissional: {pt_title}.'},
                        {'title': en_title, 'description': f'Professional service: {en_title}.'},
                        {'title': en_title, 'description': f'Service professionnel : {en_title}.'},
                        {'title': en_title, 'description': f'Servicio profesional: {en_title}.'},
                    ),
                },
            )

    def _seed_projects(self):
        samples = [
            ('campaign-launch-2025', 'campaign_videos', 'Brand X', 'Campanha de lançamento'),
            ('ceo-interview-series', 'interviews', 'Tech Co', 'Série de entrevistas'),
            ('instagram-reels-pack', 'social_reels', 'Beauty Brand', 'Pack de reels'),
            ('canva-social-kit', 'canva_designs', 'Startup', 'Kit visual Canva'),
            ('documentary-script', 'scriptwriting', 'Media House', 'Roteiro documental'),
            ('zenda-promo-reel', 'zenda_content', 'Zenda', 'Reel promocional Zenda'),
        ]
        for i, (slug, cat, client, pt_title) in enumerate(samples):
            PortfolioProject.objects.update_or_create(
                slug=slug,
                defaults={
                    'category': cat,
                    'client_name': client,
                    'is_featured': i < 4,
                    'is_published': True,
                    'order': i,
                    'translations': t(
                        {'title': pt_title, 'description': 'Projeto de destaque no portfólio.', 'role': 'Produtora & editora'},
                        {'title': pt_title, 'description': 'Featured portfolio project.', 'role': 'Producer & editor'},
                        {'title': pt_title, 'description': 'Projet portfolio en vedette.', 'role': 'Productrice & monteuse'},
                        {'title': pt_title, 'description': 'Proyecto destacado del portafolio.', 'role': 'Productora y editora'},
                    ),
                },
            )

    def _seed_showreel(self):
        ShowreelVideo.objects.update_or_create(
            is_primary=True,
            defaults={
                'title': 'Showreel 2025',
                'youtube_url': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                'is_published': True,
                'order': 0,
                'translations': t(
                    {'title': 'Showreel Profissional', 'description': 'Melhores momentos de campanhas e entrevistas.'},
                    {'title': 'Professional Showreel', 'description': 'Highlights from campaigns and interviews.'},
                    {'title': 'Showreel Professionnel', 'description': 'Meilleurs moments des campagnes et interviews.'},
                    {'title': 'Showreel Profesional', 'description': 'Mejores momentos de campañas y entrevistas.'},
                ),
            },
        )

    def _seed_testimonials(self):
        clients = [
            ('Maria Santos', 'Marketing Director', 'Retail Co'),
            ('João Silva', 'Founder', 'Tech Startup'),
            ('Ana Costa', 'Brand Manager', 'Agency'),
        ]
        for i, (name, role, company) in enumerate(clients):
            Testimonial.objects.update_or_create(
                client_name=name,
                defaults={
                    'client_role': role,
                    'client_company': company,
                    'rating': 5,
                    'order': i,
                    'is_published': True,
                    'translations': t(
                        {'quote': 'Trabalho excecional em vídeo e storytelling. Recomendo para campanhas internacionais.'},
                        {'quote': 'Exceptional video and storytelling work. Highly recommended for international campaigns.'},
                        {'quote': 'Travail vidéo et narration exceptionnels. Recommandé pour les campagnes internationales.'},
                        {'quote': 'Trabajo excepcional en video y narrativa. Muy recomendable para campañas internacionales.'},
                    ),
                },
            )

    def _seed_case_studies(self):
        CaseStudy.objects.update_or_create(
            slug='brand-campaign-q1',
            defaults={
                'client_name': 'Global Brand',
                'tools_used': 'CapCut, Canva, YouTube',
                'order': 0,
                'is_published': True,
                'translations': t(
                    {
                        'title': 'Campanha de lançamento Q1',
                        'goal': 'Aumentar awareness da marca em redes sociais.',
                        'role': 'Roteiro, produção, edição e estratégia de conteúdo.',
                        'result': '+40% engagement e vídeo hero para paid media.',
                    },
                    {
                        'title': 'Q1 Launch Campaign',
                        'goal': 'Increase brand awareness on social media.',
                        'role': 'Script, production, editing, and content strategy.',
                        'result': '+40% engagement and hero video for paid media.',
                    },
                    {
                        'title': 'Campagne de lancement T1',
                        'goal': 'Augmenter la notoriété de la marque sur les réseaux.',
                        'role': 'Script, production, montage et stratégie de contenu.',
                        'result': '+40% d\'engagement et vidéo hero pour paid media.',
                    },
                    {
                        'title': 'Campaña de lanzamiento Q1',
                        'goal': 'Aumentar el awareness de marca en redes sociales.',
                        'role': 'Guion, producción, edición y estrategia de contenido.',
                        'result': '+40% engagement y video hero para paid media.',
                    },
                ),
            },
        )

    def _seed_zenda(self):
        ZendaContent.objects.get_or_create(
            pk=1,
            defaults={
                'app_store_url': '',
                'play_store_url': 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda',
                'monthly_price_kz': 10000,
                'translations': t(
                    {
                        'headline': 'Zenda — A sua app de finanças pessoais',
                        'subheadline': 'Criada por Rubiane Joaquim para ajudar famílias a gerir dinheiro com clareza.',
                        'what_is': 'Zenda é uma app mobile de educação e gestão financeira com orçamento, metas e cursos.',
                        'who_it_helps': 'Famílias e profissionais que querem controlo financeiro diário.',
                        'benefits': [
                            'Orçamento e despesas',
                            'Metas e poupança',
                            'Cursos de educação financeira',
                            'Tarefas e lembretes',
                        ],
                    },
                    {
                        'headline': 'Zenda — Your personal finance app',
                        'subheadline': 'Created by Rubiane Joaquim to help families manage money with clarity.',
                        'what_is': 'Zenda is a mobile app for financial education and daily money management.',
                        'who_it_helps': 'Families and professionals who want daily financial control.',
                        'benefits': [
                            'Budget and expenses',
                            'Goals and savings',
                            'Financial education courses',
                            'Tasks and reminders',
                        ],
                    },
                    {
                        'headline': 'Zenda — Votre app de finances personnelles',
                        'subheadline': 'Créée par Rubiane Joaquim pour aider les familles à gérer leur argent.',
                        'what_is': 'Zenda est une application mobile d\'éducation et de gestion financière.',
                        'who_it_helps': 'Familles et professionnels souhaitant un contrôle financier quotidien.',
                        'benefits': ['Budget', 'Objectifs', 'Cours', 'Tâches'],
                    },
                    {
                        'headline': 'Zenda — Tu app de finanzas personales',
                        'subheadline': 'Creada por Rubiane Joaquim para ayudar a las familias a gestionar su dinero.',
                        'what_is': 'Zenda es una app móvil de educación y gestión financiera.',
                        'who_it_helps': 'Familias y profesionales que buscan control financiero diario.',
                        'benefits': ['Presupuesto', 'Metas', 'Cursos', 'Tareas'],
                    },
                ),
            },
        )

    def _seed_navigation(self):
        items = [
            ('/', 'Home', 'Início', 0, 'both'),
            ('/#services', 'Services', 'Serviços', 1, 'header'),
            ('/portfolio', 'Portfolio', 'Portfólio', 2, 'both'),
            ('/zenda', 'Zenda', 'Zenda', 3, 'both'),
            ('/cursos', 'Courses', 'Cursos', 4, 'both'),
            ('/mentoria', 'Mentorship', 'Mentoria', 5, 'footer'),
            ('/conteudos-gratis', 'Free Content', 'Conteúdos Grátis', 6, 'footer'),
            ('/contact', 'Contact', 'Contacto', 7, 'both'),
        ]
        for url, en_label, pt_label, order, placement in items:
            NavItem.objects.update_or_create(
                url=url,
                defaults={
                    'order': order,
                    'placement': placement,
                    'translations': t(
                        {'label': pt_label},
                        {'label': en_label},
                        {'label': en_label},
                        {'label': en_label},
                    ),
                },
            )

    def _seed_statistics(self):
        stats = [
            ('50+', 'chart', 'Projetos entregues', 'Projects delivered'),
            ('5+', 'clock', 'Anos de experiência', 'Years of experience'),
            ('98%', 'star', 'Satisfação dos clientes', 'Client satisfaction'),
        ]
        for i, (value, icon, pt_label, en_label) in enumerate(stats):
            HomepageStatistic.objects.update_or_create(
                value=value,
                defaults={
                    'icon': icon,
                    'order': i,
                    'translations': t(
                        {'label': pt_label},
                        {'label': en_label},
                        {'label': en_label},
                        {'label': en_label},
                    ),
                },
            )

    def _seed_faqs(self):
        faqs = [
            ('services', 'Que serviços oferece a Rubiane?', 'What services does Rubiane offer?',
             'Campanhas em vídeo, entrevistas, roteiros, edição CapCut, design Canva, reels e estratégia de conteúdo.'),
            ('zenda', 'O que é o Zenda?', 'What is Zenda?',
             'Zenda é a app de finanças e educação criada por Rubiane — orçamentos, metas, cursos e AI Copilot.'),
        ]
        for i, (cat, pt_q, en_q, pt_a) in enumerate(faqs):
            FAQ.objects.update_or_create(
                category=cat,
                order=i,
                defaults={
                    'translations': t(
                        {'question': pt_q, 'answer': pt_a},
                        {'question': en_q, 'answer': pt_a},
                        {'question': en_q, 'answer': pt_a},
                        {'question': en_q, 'answer': pt_a},
                    ),
                },
            )

    def _seed_page_seo(self):
        PageSEO.objects.update_or_create(
            page_key='home',
            defaults={
                'canonical_path': '/',
                'translations': t(
                    {
                        'title': 'Rubiane Joaquim | Produtora de Vídeo Criativo & Zenda',
                        'description': 'Campanhas em vídeo, entrevistas, roteiros, CapCut, Canva e criadora do Zenda.',
                        'og_title': 'Rubiane Joaquim — Creative Video & Zenda',
                    },
                    {
                        'title': 'Rubiane Joaquim | Creative Video Producer & Zenda',
                        'description': 'Campaign videos, interviews, scripts, CapCut, Canva, and creator of Zenda.',
                        'og_title': 'Rubiane Joaquim — Creative Video & Zenda',
                    },
                    {
                        'title': 'Rubiane Joaquim | Productrice Vidéo & Zenda',
                        'description': 'Vidéo, interviews, scripts et Zenda.',
                        'og_title': 'Rubiane Joaquim',
                    },
                    {
                        'title': 'Rubiane Joaquim | Video Creativo & Zenda',
                        'description': 'Videos, entrevistas, guiones y Zenda.',
                        'og_title': 'Rubiane Joaquim',
                    },
                ),
            },
        )
        PageSEO.objects.update_or_create(
            page_key='zenda',
            defaults={
                'canonical_path': '/zenda',
                'translations': t(
                    {'title': 'Zenda App | Finanças & Educação', 'description': 'App Zenda — finanças pessoais e negócio.'},
                    {'title': 'Zenda App | Finance & Education', 'description': 'Zenda app — personal and business finance.'},
                    {'title': 'Zenda', 'description': 'Zenda app'},
                    {'title': 'Zenda', 'description': 'Zenda app'},
                ),
            },
        )

    def _seed_site_translations(self):
        obj = SiteSettings.objects.first()
        if not obj:
            return
        obj.translations = t(
            {
                'brand_tagline': 'Produtora de Vídeo Criativo & Storyteller de Campanhas',
                'footer_description': 'Produção criativa de vídeo, storytelling de marketing e criadora do Zenda.',
                'footer_rights': 'Todos os direitos reservados.',
                'contact_label': 'Contacto',
                'contact_title': 'Vamos trabalhar juntos',
                'contact_subtitle': 'Conte-me sobre o seu projeto — respondo em breve.',
                'footer_navigation': 'Navegação',
                'footer_contact': 'Contacto',
            },
            {
                'brand_tagline': 'Creative Video Producer & Campaign Storyteller',
                'footer_description': 'Creative video production, marketing storytelling, and creator of Zenda.',
                'footer_rights': 'All rights reserved.',
                'contact_label': 'Contact',
                'contact_title': "Let's work together",
                'contact_subtitle': 'Tell me about your project — I will reply soon.',
                'footer_navigation': 'Navigation',
                'footer_contact': 'Contact',
            },
            {
                'brand_tagline': 'Productrice Vidéo & Narratrice',
                'footer_description': 'Production vidéo créative et Zenda.',
                'footer_rights': 'Tous droits réservés.',
            },
            {
                'brand_tagline': 'Productora de Video & Storytelling',
                'footer_description': 'Producción de video y Zenda.',
                'footer_rights': 'Todos los derechos reservados.',
            },
        )
        obj.save()
