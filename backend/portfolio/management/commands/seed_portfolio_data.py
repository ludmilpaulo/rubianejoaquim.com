"""Seed portfolio CMS data for Rubiane Joaquim creative platform."""
from django.core.management.base import BaseCommand
from portfolio.models import (
    PortfolioProject,
    Service,
    Testimonial,
    ShowreelVideo,
    CaseStudy,
    ZendaContent,
    HomeSection,
    SiteSettings,
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
        sections = [
            ('hero', {
                'title': t('Produtora de Vídeo Criativo', 'Creative Video Content Producer', 'Productrice de Contenu Vidéo Créatif', 'Productora de Contenido de Video Creativo'),
                'subtitle': t(
                    'Creative Video Content Producer & Marketing Campaign Storyteller',
                    'Creative Video Content Producer & Marketing Campaign Storyteller',
                    'Productrice de contenu vidéo créatif & narratrice de campagnes marketing',
                    'Productora de contenido de video creativo y narradora de campañas de marketing',
                ),
                'body': t(
                    'Ajudo marcas a contar histórias memoráveis através de vídeo, roteiros e conteúdo para redes sociais.',
                    'I help brands tell memorable stories through video, scripts, and social content.',
                    'J\'aide les marques à raconter des histoires mémorables via la vidéo, les scripts et les réseaux sociaux.',
                    'Ayudo a las marcas a contar historias memorables con video, guiones y contenido para redes sociales.',
                ),
                'cta_label': t('Trabalhar Comigo', 'Work With Me', 'Travailler Avec Moi', 'Trabajar Conmigo'),
            }),
            ('about', {
                'title': t('Sobre a Rubiane', 'About Rubiane', 'À propos de Rubiane', 'Sobre Rubiane'),
                'body': t(
                    'Criadora de conteúdo audiovisual que transforma ideias em campanhas, entrevistas, reels e narrativas de marca com impacto internacional.',
                    'Audiovisual creator turning ideas into campaigns, interviews, reels, and brand stories with international impact.',
                    'Créatrice audiovisuelle qui transforme les idées en campagnes, interviews, reels et récits de marque à impact international.',
                    'Creadora audiovisual que transforma ideas en campañas, entrevistas, reels e historias de marca con impacto internacional.',
                ),
            }),
        ]
        for key, trans in sections:
            HomeSection.objects.update_or_create(
                section_key=key,
                defaults={'is_active': True, 'translations': trans},
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
                    'order': i,
                    'is_active': True,
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
