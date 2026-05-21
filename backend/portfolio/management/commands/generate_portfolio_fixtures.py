"""
Build portfolio_cms.json from the seed command (for production loaddata).

Usage (from backend/):
  python manage.py generate_portfolio_fixtures
  python manage.py loaddata portfolio_cms
"""
from pathlib import Path

from django.core import serializers
from django.core.management import call_command
from django.core.management.base import BaseCommand

from portfolio.models import (
    CaseStudy,
    FAQ,
    HomeSection,
    HomepageStatistic,
    NavItem,
    PageSEO,
    PortfolioProject,
    Resource,
    Service,
    ShowreelVideo,
    SiteSettings,
    Testimonial,
    ZendaContent,
    ZendaFeature,
)

FIXTURE_MODELS = [
    SiteSettings,
    HomeSection,
    Service,
    PortfolioProject,
    ShowreelVideo,
    Testimonial,
    CaseStudy,
    ZendaContent,
    ZendaFeature,
    NavItem,
    HomepageStatistic,
    FAQ,
    Resource,
    PageSEO,
]


class Command(BaseCommand):
    help = 'Regenerate portfolio/fixtures/portfolio_cms.json from seed_portfolio_data'

    def handle(self, *args, **options):
        call_command('seed_portfolio_data', verbosity=0)

        objects = []
        for model in FIXTURE_MODELS:
            objects.extend(model.objects.order_by('pk'))

        fixture_path = Path(__file__).resolve().parents[2] / 'fixtures' / 'portfolio_cms.json'
        fixture_path.parent.mkdir(parents=True, exist_ok=True)

        json_text = serializers.serialize('json', objects, indent=2, use_natural_foreign_keys=False)
        if isinstance(json_text, bytes):
            json_text = json_text.decode('utf-8')
        fixture_path.write_text(json_text, encoding='utf-8')

        self.stdout.write(
            self.style.SUCCESS(
                f'Wrote {len(objects)} records to {fixture_path}\n'
                f'Load in production: python manage.py loaddata portfolio_cms'
            )
        )
