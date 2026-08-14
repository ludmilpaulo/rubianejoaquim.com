"""Realistic Family Finance demo data. Refuses to run when DEBUG is False."""
import secrets
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from finance_space.models import (
    FamilyActivity,
    FamilyEntry,
    FamilyEntryShare,
    FinanceSpace,
    FinanceSpaceMember,
    SharedBudget,
    SharedGoal,
)

User = get_user_model()


def _invite_code():
    while True:
        code = ('F' + secrets.token_hex(4).upper())[:8]
        if not FinanceSpace.objects.filter(invite_code__iexact=code).exists():
            return code


class Command(BaseCommand):
    help = 'Seed a realistic family finance demo (DEBUG only). Does not run in production.'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Refusing to seed family demo data when DEBUG is False.')

        owner, _ = User.objects.get_or_create(
            email='paulo.avelino@example.com',
            defaults={
                'username': 'paulo_avelino',
                'first_name': 'Paulo',
                'last_name': 'Avelino',
            },
        )
        if not owner.has_usable_password():
            owner.set_password('AvelinoFamily2026')
            owner.save(update_fields=['password'])

        erica, _ = User.objects.get_or_create(
            email='erica.avelino@example.com',
            defaults={
                'username': 'erica_avelino',
                'first_name': 'Erica',
                'last_name': 'Avelino',
            },
        )
        jorge, _ = User.objects.get_or_create(
            email='jorge.avelino@example.com',
            defaults={
                'username': 'jorge_avelino',
                'first_name': 'Jorge',
                'last_name': 'Avelino',
            },
        )

        space, created = FinanceSpace.objects.get_or_create(
            owner=owner,
            name='Avelino Family',
            defaults={
                'currency': 'ZAR',
                'description': 'Shared household finances for the Avelino family.',
                'require_approval': False,
                'invite_code': _invite_code(),
                'invite_expires_at': timezone.now() + timedelta(days=30),
            },
        )
        FinanceSpaceMember.objects.update_or_create(
            space=space, user=owner, defaults={'role': 'owner', 'status': 'active'}
        )
        FinanceSpaceMember.objects.update_or_create(
            space=space, user=erica, defaults={'role': 'adult', 'status': 'active'}
        )
        FinanceSpaceMember.objects.update_or_create(
            space=space, user=jorge, defaults={'role': 'adult', 'status': 'active'}
        )

        today = date.today()
        SharedBudget.objects.get_or_create(
            space=space,
            name='Monthly household',
            month=today.month,
            year=today.year,
            defaults={'amount': Decimal('15000.00'), 'currency': 'ZAR', 'spent': Decimal('4000.00')},
        )
        SharedGoal.objects.get_or_create(
            space=space,
            title='House deposit',
            defaults={
                'target_amount': Decimal('100000.00'),
                'current_amount': Decimal('35000.00'),
                'currency': 'ZAR',
                'created_by': owner,
                'target_date': today.replace(year=today.year + 1),
            },
        )

        groceries, g_created = FamilyEntry.objects.get_or_create(
            space=space,
            user=owner,
            title='Groceries',
            date=today,
            defaults={
                'kind': 'expense',
                'category': 'Food',
                'amount': Decimal('2500.00'),
                'currency': 'ZAR',
                'converted_amount': Decimal('2500.00'),
                'exchange_rate': Decimal('1'),
                'visibility': 'family',
                'paid_by': owner,
            },
        )
        if g_created:
            FamilyEntryShare.objects.create(entry=groceries, user=owner, share_amount=Decimal('833.34'))
            FamilyEntryShare.objects.create(entry=groceries, user=erica, share_amount=Decimal('833.33'))
            FamilyEntryShare.objects.create(entry=groceries, user=jorge, share_amount=Decimal('833.33'))

        FamilyEntry.objects.get_or_create(
            space=space,
            user=erica,
            title='Salary',
            date=today.replace(day=1),
            defaults={
                'kind': 'income',
                'category': 'Salary',
                'amount': Decimal('18000.00'),
                'currency': 'ZAR',
                'converted_amount': Decimal('18000.00'),
                'exchange_rate': Decimal('1'),
                'visibility': 'family',
                'paid_by': erica,
            },
        )
        FamilyEntry.objects.get_or_create(
            space=space,
            user=jorge,
            title='Electricity',
            date=today,
            defaults={
                'kind': 'bill',
                'category': 'Utilities',
                'amount': Decimal('500.00'),
                'currency': 'ZAR',
                'converted_amount': Decimal('500.00'),
                'exchange_rate': Decimal('1'),
                'visibility': 'family',
                'paid_by': jorge,
                'due_date': today + timedelta(days=3),
            },
        )
        FamilyEntry.objects.get_or_create(
            space=space,
            user=owner,
            title='School fees (USD)',
            date=today,
            defaults={
                'kind': 'expense',
                'category': 'Education',
                'amount': Decimal('1000.00'),
                'currency': 'USD',
                'converted_amount': Decimal('18500.00'),
                'exchange_rate': Decimal('18.50'),
                'exchange_rate_source': 'open.er-api.com',
                'exchange_rate_timestamp': timezone.now(),
                'visibility': 'family',
                'paid_by': owner,
            },
        )
        FamilyActivity.objects.get_or_create(
            space=space,
            user=owner,
            message='Paulo added R2,500 groceries',
        )
        FamilyActivity.objects.get_or_create(
            space=space,
            user=erica,
            message='Erica added R1,000 savings',
        )
        FamilyActivity.objects.get_or_create(
            space=space,
            user=jorge,
            message='Jorge paid R500 electricity',
        )

        self.stdout.write(self.style.SUCCESS(
            f'Avelino Family ready (id={space.id}, invite={space.invite_code}, created={created}).'
        ))
