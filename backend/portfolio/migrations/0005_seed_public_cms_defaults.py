from django.db import migrations


def translated(pt, en, fr, es):
    return {'pt': pt, 'en': en, 'fr': fr, 'es': es}


def upsert_first(model, lookup, defaults):
    obj = model.objects.filter(**lookup).order_by('pk').first()
    if obj:
        for key, value in defaults.items():
            setattr(obj, key, value)
        obj.save(update_fields=list(defaults.keys()))
        return obj
    return model.objects.create(**lookup, **defaults)


def seed_defaults(apps, schema_editor):
    FAQ = apps.get_model('portfolio', 'FAQ')
    HomeSection = apps.get_model('portfolio', 'HomeSection')
    ZendaContent = apps.get_model('portfolio', 'ZendaContent')
    ZendaFeature = apps.get_model('portfolio', 'ZendaFeature')

    faq_rows = [
        (
            'services',
            0,
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
            1,
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
            0,
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
            1,
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
    for category, order, translations in faq_rows:
        upsert_first(
            FAQ,
            {'category': category, 'order': order},
            {'is_active': True, 'translations': translations},
        )

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

    zenda_content = ZendaContent.objects.filter(is_active=True).first()
    if not zenda_content:
        return

    features = [
        ('wallet', 'personal_finance', 'Orcamento inteligente', 'Smart budgeting'),
        ('store', 'business_finance', 'Financas para negocio', 'Business finance'),
        ('robot', 'ai_copilot', 'AI Copilot financeiro', 'AI financial copilot'),
        ('school', 'education', 'Cursos e aulas', 'Courses and lessons'),
        ('target', 'goals', 'Metas e poupanca', 'Goals and savings'),
        ('shield', 'security', 'Dados organizados com seguranca', 'Organized and secure data'),
    ]
    for order, (icon, category, pt_title, en_title) in enumerate(features):
        upsert_first(
            ZendaFeature,
            {'zenda_content': zenda_content, 'category': category, 'order': order},
            {
                'icon': icon,
                'is_active': True,
                'is_premium': category == 'ai_copilot',
                'translations': translated(
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


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0004_faq_newsletter_section'),
    ]

    operations = [
        migrations.RunPython(seed_defaults, migrations.RunPython.noop),
    ]
