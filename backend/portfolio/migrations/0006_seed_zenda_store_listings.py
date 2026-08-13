from decimal import Decimal

from django.db import migrations

IOS = 'https://apps.apple.com/app/id6758412176'
ANDROID = 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda'

TRANSLATIONS = {
    'pt': {
        'headline': 'Zenda',
        'subheadline': 'Uma app. O seu dinheiro. A sua vida. O seu negócio.',
        'what_is': 'Descarregue o Zenda e gira as suas finanças, dinheiro, negócio e muito mais.',
        'who_it_helps': 'Pessoas, famílias e pequenos negócios que querem controlo claro do dinheiro.',
        'benefits': [
            'Salário e orçamentos',
            'Despesas e dívidas',
            'Poupança e metas',
            'Finanças do negócio',
            'Câmbio em tempo real',
        ],
    },
    'en': {
        'headline': 'Zenda',
        'subheadline': 'One app. Your money. Your life. Your business.',
        'what_is': 'Download Zenda and manage your finances, money, business and more.',
        'who_it_helps': 'Individuals, families and small businesses who want daily money control.',
        'benefits': [
            'Salary and budgets',
            'Expenses and debts',
            'Savings and goals',
            'Business finance',
            'Live currency conversion',
        ],
    },
    'fr': {
        'headline': 'Zenda',
        'subheadline': 'Une app. Votre argent. Votre vie. Votre entreprise.',
        'what_is': 'Téléchargez Zenda et gérez vos finances, votre argent, votre entreprise et plus encore.',
        'who_it_helps': 'Particuliers, familles et petites entreprises.',
        'benefits': ['Salaire et budgets', 'Dépenses et dettes', 'Épargne et objectifs', 'Finance d’entreprise'],
    },
    'es': {
        'headline': 'Zenda',
        'subheadline': 'Una app. Tu dinero. Tu vida. Tu negocio.',
        'what_is': 'Descarga Zenda y gestiona tus finanzas, dinero, negocio y más.',
        'who_it_helps': 'Personas, familias y pequeños negocios.',
        'benefits': ['Salario y presupuestos', 'Gastos y deudas', 'Ahorro y metas', 'Finanzas del negocio'],
    },
}


def seed_zenda(apps, schema_editor):
    ZendaContent = apps.get_model('portfolio', 'ZendaContent')
    obj = ZendaContent.objects.filter(is_active=True).first()
    if obj is None:
        ZendaContent.objects.create(
            app_store_url=IOS,
            play_store_url=ANDROID,
            monthly_price_kz=Decimal('10000'),
            is_active=True,
            translations=TRANSLATIONS,
        )
        return
    updates = {}
    if not obj.app_store_url:
        updates['app_store_url'] = IOS
    if not obj.play_store_url:
        updates['play_store_url'] = ANDROID
    translations = dict(obj.translations or {})
    if not translations.get('en', {}).get('headline') and not translations.get('pt', {}).get('headline'):
        translations.update(TRANSLATIONS)
        updates['translations'] = translations
    if updates:
        ZendaContent.objects.filter(pk=obj.pk).update(**updates)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('portfolio', '0005_seed_public_cms_defaults'),
    ]

    operations = [
        migrations.RunPython(seed_zenda, noop),
    ]
