"""
Load all production CMS/content fixtures (JSON) in the correct order.

Usage (from backend/, after migrate):
  python manage.py load_production_data
  python manage.py load_production_data --only portfolio
  python manage.py load_production_data --only courses
  python manage.py load_production_data --only rates

Regenerate fixture files from dev seeds:
  python manage.py generate_all_fixtures
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand

FIXTURE_ORDER = [
    ('portfolio', 'portfolio_cms', 'Portfolio CMS (site, services, Zenda page, SEO)'),
    ('courses', 'courses_content', 'Financial education courses & lessons'),
    ('rates', 'exchange_rates', 'FX rates for currency converter'),
]


class Command(BaseCommand):
    help = 'Load production JSON fixtures via loaddata (portfolio, courses, exchange rates)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--only',
            choices=['portfolio', 'courses', 'rates'],
            action='append',
            dest='only',
            help='Load only selected fixture group(s); can be repeated',
        )

    def handle(self, *args, **options):
        only = options.get('only') or []
        groups = [g for g in FIXTURE_ORDER if not only or g[0] in only]

        if not groups:
            self.stderr.write(self.style.ERROR('No fixture groups selected.'))
            return

        self.stdout.write('Loading production fixtures...')
        for _key, fixture_name, label in groups:
            self.stdout.write(f'  → {label} ({fixture_name})')
            try:
                call_command('loaddata', fixture_name, verbosity=1)
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f'Failed loading {fixture_name}: {exc}'))
                raise

        self.stdout.write(self.style.SUCCESS('Production data loaded successfully.'))
        self.stdout.write(
            'Tip: on an existing DB with conflicting PKs, clear CMS tables in admin '
            'or use a fresh database after migrate.'
        )
