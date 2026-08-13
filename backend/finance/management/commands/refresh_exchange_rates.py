"""Fetch live FX rates into the ExchangeRate cache."""
from django.core.management.base import BaseCommand

from finance.fx import refresh_exchange_rates


class Command(BaseCommand):
    help = 'Refresh exchange rates from live FX providers (open.er-api / exchangerate-api / Frankfurter)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force refresh even if cache is still fresh',
        )

    def handle(self, *args, **options):
        result = refresh_exchange_rates(force=options['force'])
        if result.get('error'):
            self.stdout.write(self.style.WARNING(
                f"FX refresh stale/failed: {result.get('error')} "
                f"(using {result.get('count')} cached rates, source={result.get('source')})"
            ))
        elif result.get('refreshed'):
            self.stdout.write(self.style.SUCCESS(
                f"Refreshed {result['count']} rates from {result.get('source')} "
                f"at {result.get('updated_at')}"
            ))
            missing = result.get('missing') or []
            if missing:
                self.stdout.write(self.style.WARNING(
                    f"Provider omitted (kept previous): {', '.join(missing)}"
                ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"Rates still fresh ({result.get('count')} rows, "
                f"updated {result.get('updated_at')}, source={result.get('source')})"
            ))
