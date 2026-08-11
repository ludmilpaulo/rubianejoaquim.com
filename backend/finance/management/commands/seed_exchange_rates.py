"""
Emergency bootstrap only — approximate USD-base rates for empty databases.

Production MUST replace these with live market rates:
  python manage.py refresh_exchange_rates --force

See EXCHANGE_RATES.md for provider details. Never treat seed rows as live truth.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from finance.models import ExchangeRate

# Approximate seed rates — NOT live market data.
RATES_USD_BASE = {
    'EUR': Decimal('0.92'),
    'GBP': Decimal('0.79'),
    'AOA': Decimal('830.00'),
    'MZN': Decimal('63.50'),
    'ZAR': Decimal('18.20'),
    'BRL': Decimal('4.95'),
    'CAD': Decimal('1.36'),
    'USD': Decimal('1.00'),
}


class Command(BaseCommand):
    help = (
        'EMERGENCY bootstrap: seed approximate exchange rates (USD base). '
        'Run refresh_exchange_rates --force afterwards.'
    )

    def handle(self, *args, **options):
        now = timezone.now()
        for target, rate in RATES_USD_BASE.items():
            ExchangeRate.objects.update_or_create(
                base_currency='USD',
                target_currency=target,
                defaults={
                    'rate': rate,
                    'source': 'seed',
                    'provider_updated_at': now,
                },
            )
        self.stdout.write(
            self.style.WARNING(
                f'Seeded {len(RATES_USD_BASE)} approximate rates (source=seed). '
                'Run: python manage.py refresh_exchange_rates --force'
            )
        )
