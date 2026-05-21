"""Seed approximate FX rates (USD base). Update via admin or cron in production."""
from decimal import Decimal
from django.core.management.base import BaseCommand
from finance.models import ExchangeRate

# Approximate rates — replace with live API in production
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
    help = 'Seed exchange rates (USD base)'

    def handle(self, *args, **options):
        for target, rate in RATES_USD_BASE.items():
            ExchangeRate.objects.update_or_create(
                base_currency='USD',
                target_currency=target,
                defaults={'rate': rate},
            )
        self.stdout.write(self.style.SUCCESS(f'Seeded {len(RATES_USD_BASE)} exchange rates.'))
