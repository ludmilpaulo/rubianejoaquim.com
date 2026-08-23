"""Smoke test outbound HTTPS to iKhokha from this server (e.g. PythonAnywhere console)."""
from django.core.management.base import BaseCommand

import requests

from subscriptions.ikhokha import DEFAULT_PAYMENT_URL, test_connection


class Command(BaseCommand):
    help = 'Verify this server can reach api.ikhokha.com and optionally test saved credentials.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-credentials',
            action='store_true',
            help='Also run admin credential test using saved DB/env config.',
        )

    def handle(self, *args, **options):
        self.stdout.write('Checking HTTPS reachability to iKhokha…')
        try:
            response = requests.post(
                DEFAULT_PAYMENT_URL,
                headers={'Content-Type': 'application/json', 'IK-APPID': 'ping', 'IK-SIGN': '0' * 64},
                json={},
                timeout=20,
            )
            self.stdout.write(self.style.SUCCESS(
                f'OK reachability HTTP {response.status_code} (gateway responded)'
            ))
        except requests.RequestException as exc:
            self.stdout.write(self.style.ERROR(f'FAILED reachability: {exc}'))
            self.stdout.write(
                'PythonAnywhere free accounts block non-allowlisted APIs. '
                'Request allowlisting for api.ikhokha.com at help.pythonanywhere.com '
                '(docs: https://developer.ikhokha.com/overview) or use a paid plan.'
            )
            return

        if options['test_credentials']:
            result = test_connection()
            if result.get('ok'):
                self.stdout.write(self.style.SUCCESS(f"Credentials OK — mode={result.get('mode')}"))
            else:
                self.stdout.write(self.style.ERROR(result.get('message') or 'Credential test failed'))
