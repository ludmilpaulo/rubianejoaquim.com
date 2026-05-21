"""
Build exchange_rates.json from seed_exchange_rates (for production loaddata).

Usage (from backend/):
  python manage.py generate_exchange_rates_fixtures
  python manage.py loaddata exchange_rates
"""
from pathlib import Path

from django.core import serializers
from django.core.management import call_command
from django.core.management.base import BaseCommand

from finance.models import ExchangeRate


class Command(BaseCommand):
    help = 'Regenerate finance/fixtures/exchange_rates.json from seed_exchange_rates'

    def handle(self, *args, **options):
        call_command('seed_exchange_rates', verbosity=0)

        objects = list(ExchangeRate.objects.order_by('pk'))
        fixture_path = Path(__file__).resolve().parents[2] / 'fixtures' / 'exchange_rates.json'
        fixture_path.parent.mkdir(parents=True, exist_ok=True)

        json_text = serializers.serialize('json', objects, indent=2, use_natural_foreign_keys=False)
        if isinstance(json_text, bytes):
            json_text = json_text.decode('utf-8')
        fixture_path.write_text(json_text, encoding='utf-8')

        self.stdout.write(
            self.style.SUCCESS(
                f'Wrote {len(objects)} records to {fixture_path}\n'
                f'Load in production: python manage.py loaddata exchange_rates'
            )
        )
