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
    Resource,
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
        self._seed_faq_newsletter()
        self._seed_page_seo()
        self._seed_resources()
        self._seed_resources_intro()
        self._seed_contact_intro()
        self._seed_portfolio_intro_labels()
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
        content, _ = ZendaContent.objects.update_or_create(
            pk=1,
            defaults={
                'app_store_url': 'https://apps.apple.com/app/id6758412176',
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
        features = [
            ('wallet', 'personal_finance', 'Orcamento inteligente', 'Smart budgeting'),
            ('store', 'business_finance', 'Financas para negocio', 'Business finance'),
            ('robot', 'ai_copilot', 'AI Copilot financeiro', 'AI financial copilot'),
            ('school', 'education', 'Cursos e aulas', 'Courses and lessons'),
            ('target', 'goals', 'Metas e poupanca', 'Goals and savings'),
            ('shield', 'security', 'Dados organizados com seguranca', 'Organized and secure data'),
        ]
        for i, (icon, category, pt_title, en_title) in enumerate(features):
            ZendaFeature.objects.update_or_create(
                zenda_content=content,
                category=category,
                order=i,
                defaults={
                    'icon': icon,
                    'is_active': True,
                    'is_premium': category in {'ai_copilot', 'reports'},
                    'translations': t(
                        {
                            'title': pt_title,
                            'description': 'Uma experiencia mobile pensada para decisoes financeiras claras no dia a dia.',
                        },
                        {
                            'title': en_title,
                            'description': 'A mobile experience designed for clearer everyday financial decisions.',
                        },
                        {
                            'title': en_title,
                            'description': 'Une experience mobile pour des decisions financieres plus claires.',
                        },
                        {
                            'title': en_title,
                            'description': 'Una experiencia mobile para decisiones financieras mas claras.',
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

    def _seed_legacy_faqs(self):
        faqs = [
            (
                'services',
                {
                    'pt': {
                        'question': 'Que servicos oferece a Rubiane?',
                        'answer': 'Campanhas em video, entrevistas, roteiros, edicao CapCut, design Canva, reels e estrategia de conteudo.',
                    },
                    'en': {
                        'question': 'What services does Rubiane offer?',
                        'answer': 'Campaign videos, interviews, scripts, CapCut editing, Canva visuals, reels, and content strategy.',
                    },
                    'fr': {
                        'question': 'Quels services Rubiane propose-t-elle ?',
                        'answer': 'Videos de campagne, interviews, scripts, montage CapCut, visuels Canva, reels et strategie de contenu.',
                    },
                    'es': {
                        'question': 'Que servicios ofrece Rubiane?',
                        'answer': 'Videos de campana, entrevistas, guiones, edicion CapCut, visuales Canva, reels y estrategia de contenido.',
                    },
                },
            ),
            (
                'services',
                {
                    'pt': {
                        'question': 'Tambem trabalha com marcas internacionais?',
                        'answer': 'Sim. O portfolio e o processo foram pensados para clientes em portugues, ingles, frances e espanhol.',
                    },
                    'en': {
                        'question': 'Do you work with international brands?',
                        'answer': 'Yes. The portfolio and production process are prepared for Portuguese, English, French, and Spanish projects.',
                    },
                    'fr': {
                        'question': 'Travaillez-vous avec des marques internationales ?',
                        'answer': 'Oui. Le portfolio et le processus sont prets pour des projets en portugais, anglais, francais et espagnol.',
                    },
                    'es': {
                        'question': 'Trabajas con marcas internacionales?',
                        'answer': 'Si. El portfolio y el proceso estan preparados para proyectos en portugues, ingles, frances y espanol.',
                    },
                },
            ),
            (
                'zenda',
                {
                    'pt': {
                        'question': 'O que e o Zenda?',
                        'answer': 'Zenda e a app de financas e educacao criada por Rubiane: orcamentos, metas, cursos, tarefas e AI Copilot.',
                    },
                    'en': {
                        'question': 'What is Zenda?',
                        'answer': 'Zenda is Rubiane\'s finance and education app: budgets, goals, courses, tasks, and an AI Copilot.',
                    },
                    'fr': {
                        'question': 'Qu\'est-ce que Zenda ?',
                        'answer': 'Zenda est l\'app finance et education de Rubiane : budgets, objectifs, cours, taches et copilot IA.',
                    },
                    'es': {
                        'question': 'Que es Zenda?',
                        'answer': 'Zenda es la app de finanzas y educacion de Rubiane: presupuestos, metas, cursos, tareas y copiloto IA.',
                    },
                },
            ),
            (
                'zenda',
                {
                    'pt': {
                        'question': 'A app e multilingue?',
                        'answer': 'Sim. Zenda suporta portugues, ingles, frances e espanhol, com preferencia guardada no perfil.',
                    },
                    'en': {
                        'question': 'Is the app multilingual?',
                        'answer': 'Yes. Zenda supports Portuguese, English, French, and Spanish, with the preference saved on the profile.',
                    },
                    'fr': {
                        'question': 'L\'application est-elle multilingue ?',
                        'answer': 'Oui. Zenda prend en charge le portugais, l\'anglais, le francais et l\'espagnol.',
                    },
                    'es': {
                        'question': 'La app es multilingue?',
                        'answer': 'Si. Zenda soporta portugues, ingles, frances y espanol, con preferencia guardada en el perfil.',
                    },
                },
            ),
        ]
        for i, (cat, translations) in enumerate(faqs):
            FAQ.objects.update_or_create(
                category=cat,
                order=i,
                defaults={
                    'is_active': True,
                    'translations': translations,
                },
            )

    def _seed_faq_newsletter(self):
        HomeSection.objects.update_or_create(
            section_key='faq_newsletter',
            defaults={
                'is_active': True,
                'translations': {
                    'pt': {
                        'title': 'Perguntas frequentes e novidades',
                        'subtitle': 'Respostas rapidas antes de comecarmos e conteudos uteis direto no seu email.',
                        'body': 'Receba ideias sobre video, marketing, Zenda e educacao financeira.',
                        'badge': 'FAQ + newsletter',
                        'cta_label': 'Subscrever',
                        'extra_data': {
                            'newsletter_placeholder': 'O seu email',
                            'newsletter_success': 'Subscricao confirmada. Obrigada!',
                            'newsletter_error': 'Nao foi possivel subscrever. Tente novamente.',
                            'newsletter_note': 'Sem spam. Apenas recursos uteis e novidades importantes.',
                        },
                    },
                    'en': {
                        'title': 'Frequently asked questions and updates',
                        'subtitle': 'Quick answers before we start, plus useful content in your inbox.',
                        'body': 'Get ideas about video, marketing, Zenda, and financial education.',
                        'badge': 'FAQ + newsletter',
                        'cta_label': 'Subscribe',
                        'extra_data': {
                            'newsletter_placeholder': 'Your email',
                            'newsletter_success': 'Subscription confirmed. Thank you!',
                            'newsletter_error': 'Could not subscribe. Please try again.',
                            'newsletter_note': 'No spam. Only useful resources and important updates.',
                        },
                    },
                    'fr': {
                        'title': 'Questions frequentes et nouveautes',
                        'subtitle': 'Des reponses rapides et du contenu utile dans votre boite mail.',
                        'body': 'Recevez des idees sur la video, le marketing, Zenda et l\'education financiere.',
                        'badge': 'FAQ + newsletter',
                        'cta_label': 'S\'abonner',
                        'extra_data': {
                            'newsletter_placeholder': 'Votre email',
                            'newsletter_success': 'Inscription confirmee. Merci !',
                            'newsletter_error': 'Inscription impossible. Reessayez.',
                            'newsletter_note': 'Pas de spam. Seulement des ressources utiles.',
                        },
                    },
                    'es': {
                        'title': 'Preguntas frecuentes y novedades',
                        'subtitle': 'Respuestas rapidas y contenido util en tu email.',
                        'body': 'Recibe ideas sobre video, marketing, Zenda y educacion financiera.',
                        'badge': 'FAQ + newsletter',
                        'cta_label': 'Suscribirse',
                        'extra_data': {
                            'newsletter_placeholder': 'Tu email',
                            'newsletter_success': 'Suscripcion confirmada. Gracias!',
                            'newsletter_error': 'No se pudo suscribir. Intentalo de nuevo.',
                            'newsletter_note': 'Sin spam. Solo recursos utiles y novedades importantes.',
                        },
                    },
                },
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

    def _seed_resources(self):
        samples = [
            ('guia-orcamento', 'pdf', 'education', 'Guia de orçamento familiar'),
            ('video-financas-101', 'video', 'education', 'Finanças 101 — vídeo grátis'),
            ('template-canva-posts', 'template', 'marketing', 'Template Canva para posts'),
        ]
        for i, (slug, rtype, cat, pt_title) in enumerate(samples):
            Resource.objects.update_or_create(
                slug=slug,
                defaults={
                    'resource_type': rtype,
                    'category': cat,
                    'is_published': True,
                    'is_featured': True,
                    'order': i,
                    'translations': t(
                        {'title': pt_title, 'description': 'Recurso gratuito da Rubiane Joaquim.'},
                        {'title': pt_title, 'description': 'Free resource from Rubiane Joaquim.'},
                        {'title': pt_title, 'description': 'Ressource gratuite.'},
                        {'title': pt_title, 'description': 'Recurso gratuito.'},
                    ),
                },
            )

    def _seed_resources_intro(self):
        HomeSection.objects.update_or_create(
            section_key='resources_intro',
            defaults={
                'is_active': True,
                'translations': t(
                    {
                        'title': 'Conteúdos e recursos grátis',
                        'subtitle': 'Guias, vídeos e templates para marcas e finanças',
                        'cta_label': 'Ver todos os recursos',
                        'extra_data': {'view_all_href': '/conteudos-gratis'},
                    },
                    {
                        'title': 'Free content & resources',
                        'subtitle': 'Guides, videos, and templates for brands and finance',
                        'cta_label': 'View all resources',
                        'extra_data': {'view_all_href': '/conteudos-gratis'},
                    },
                    {
                        'title': 'Contenus et ressources gratuits',
                        'subtitle': 'Guides, vidéos et modèles',
                        'cta_label': 'Voir tout',
                        'extra_data': {'view_all_href': '/conteudos-gratis'},
                    },
                    {
                        'title': 'Contenidos y recursos gratis',
                        'subtitle': 'Guías, vídeos y plantillas',
                        'cta_label': 'Ver todo',
                        'extra_data': {'view_all_href': '/conteudos-gratis'},
                    },
                ),
            },
        )

    def _seed_contact_intro(self):
        HomeSection.objects.update_or_create(
            section_key='contact_intro',
            defaults={'is_active': True, 'translations': {}},
        )

    def _seed_portfolio_intro_labels(self):
        section = HomeSection.objects.filter(section_key='portfolio_intro').first()
        if not section:
            return
        labels_pt = {
            'all': 'Todos',
            'campaign_videos': 'Campanhas',
            'interviews': 'Entrevistas',
            'social_reels': 'Reels',
            'canva_designs': 'Canva',
            'scriptwriting': 'Roteiros',
            'zenda_content': 'Zenda',
            'view_all_label': 'Ver portfólio completo',
            'empty_label': 'Novos projetos em breve.',
        }
        labels_en = {
            'all': 'All',
            'campaign_videos': 'Campaigns',
            'interviews': 'Interviews',
            'social_reels': 'Reels',
            'canva_designs': 'Canva',
            'scriptwriting': 'Scripts',
            'zenda_content': 'Zenda',
            'view_all_label': 'View full portfolio',
            'empty_label': 'New projects coming soon.',
        }
        trans = dict(section.translations or {})
        for loc, labels in [('pt', labels_pt), ('en', labels_en), ('fr', labels_en), ('es', labels_en)]:
            block = dict(trans.get(loc) or {})
            block['category_labels'] = labels
            block['extra_data'] = {**(block.get('extra_data') or {}), **labels}
            trans[loc] = block
        section.translations = trans
        section.save(update_fields=['translations'])

    def _seed_site_translations(self):
        obj = SiteSettings.objects.first()
        if not obj:
            return
        contact_form_pt = {
            'name': 'Nome',
            'email': 'Email',
            'phone': 'Telefone',
            'subject': 'Assunto',
            'message': 'Mensagem',
            'service_interest': 'Serviço de interesse',
            'budget_range': 'Orçamento estimado',
            'project_type': 'Tipo de projeto',
            'submit': 'Enviar mensagem',
            'submitting': 'A enviar…',
            'success': 'Mensagem enviada. Obrigado!',
            'error': 'Erro ao enviar. Tente novamente.',
            'required': 'Obrigatório',
            'whatsapp_label': 'WhatsApp',
            'email_label': 'Email',
        }
        contact_form_en = {
            'name': 'Name',
            'email': 'Email',
            'phone': 'Phone',
            'subject': 'Subject',
            'message': 'Message',
            'service_interest': 'Service of interest',
            'budget_range': 'Budget range',
            'project_type': 'Project type',
            'submit': 'Send message',
            'submitting': 'Sending…',
            'success': 'Message sent. Thank you!',
            'error': 'Could not send. Please try again.',
            'required': 'Required',
            'whatsapp_label': 'WhatsApp',
            'email_label': 'Email',
        }
        obj.translations = t(
            {
                'brand_name': 'Rubiane Joaquim',
                'brand_tagline': 'Produtora de Vídeo Criativo & Storyteller de Campanhas',
                'footer_description': 'Produção criativa de vídeo, storytelling de marketing e criadora do Zenda.',
                'footer_rights': 'Todos os direitos reservados.',
                'contact_label': 'Contacto',
                'contact_title': 'Vamos trabalhar juntos',
                'contact_subtitle': 'Conte-me sobre o seu projeto — respondo em breve.',
                'footer_navigation': 'Navegação',
                'footer_contact': 'Contacto',
                'contact_form': contact_form_pt,
                'play_store_label': 'Play Store',
                'app_store_label': 'App Store',
                'what_is_label': 'O que é',
                'who_label': 'Para quem',
            },
            {
                'brand_name': 'Rubiane Joaquim',
                'brand_tagline': 'Creative Video Producer & Campaign Storyteller',
                'footer_description': 'Creative video production, marketing storytelling, and creator of Zenda.',
                'footer_rights': 'All rights reserved.',
                'contact_label': 'Contact',
                'contact_title': "Let's work together",
                'contact_subtitle': 'Tell me about your project — I will reply soon.',
                'footer_navigation': 'Navigation',
                'footer_contact': 'Contact',
                'contact_form': contact_form_en,
                'play_store_label': 'Play Store',
                'app_store_label': 'App Store',
                'what_is_label': 'What it is',
                'who_label': 'Who it helps',
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
