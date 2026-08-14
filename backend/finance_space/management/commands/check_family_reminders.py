"""Notify family members about approaching bills and goal gaps. Safe to cron daily."""
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from finance_space.models import FamilyEntry, SharedBudget, SharedGoal
from finance_space.views import _notify


class Command(BaseCommand):
    help = 'Send family bill due-date and savings-goal reminders.'

    def handle(self, *args, **options):
        today = date.today()
        soon = today + timedelta(days=3)
        sent = 0

        bills = FamilyEntry.objects.filter(
            kind__in=('bill', 'debt'),
            due_date__gte=today,
            due_date__lte=soon,
            visibility='family',
        ).select_related('space', 'space__owner')
        for bill in bills:
            days = (bill.due_date - today).days if bill.due_date else 0
            members = bill.space.members.filter(status='active', role__in=('owner', 'adult'))
            message = (
                f'{bill.title} is due today.'
                if days == 0
                else f'{bill.title} payment is due in {days} day{"s" if days != 1 else ""}.'
            )
            for member in members:
                _notify(member.user, 'Family bill reminder', message, bill.space_id)
                sent += 1

        now = timezone.now()
        budgets = SharedBudget.objects.filter(month=now.month, year=now.year, amount__gt=0)
        for budget in budgets:
            if budget.spent < budget.amount:
                continue
            members = budget.space.members.filter(status='active', role='owner')
            for member in members:
                _notify(
                    member.user,
                    'Family budget reached',
                    'Family spending has exceeded the monthly budget.',
                    budget.space_id,
                )
                sent += 1

        goals = SharedGoal.objects.filter(target_amount__gt=0)
        for goal in goals:
            gap = goal.target_amount - goal.current_amount
            if gap <= Decimal('0') or gap > goal.target_amount * Decimal('0.1'):
                continue
            members = goal.space.members.filter(status='active', role='owner')
            for member in members:
                _notify(
                    member.user,
                    'Family goal',
                    f'Your family is {gap} {goal.currency} away from {goal.title}.',
                    goal.space_id,
                )
                sent += 1

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} family reminder(s).'))
