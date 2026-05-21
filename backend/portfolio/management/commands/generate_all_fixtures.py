"""Regenerate every production JSON fixture from seed commands."""
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Run generate_portfolio_fixtures, generate_courses_fixtures, generate_exchange_rates_fixtures'

    def handle(self, *args, **options):
        for cmd in (
            'generate_portfolio_fixtures',
            'generate_courses_fixtures',
            'generate_exchange_rates_fixtures',
        ):
            self.stdout.write(f'Running {cmd}...')
            call_command(cmd, verbosity=1)
        self.stdout.write(self.style.SUCCESS('All fixture files updated.'))
