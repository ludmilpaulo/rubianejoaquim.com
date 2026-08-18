"""Copilot write actions — never applied until the user confirms."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.utils.dateparse import parse_date

from finance.models import Budget, Category, Goal, PersonalExpense


def execute_action(user, action: dict) -> dict:
    kind = action.get('type')
    if kind in ('send_money', 'withdraw', 'add_funds', 'buy_airtime', 'buy_electricity', 'wallet_transfer'):
        return {'ok': False, 'error': 'wallet_actions_forbidden', 'detail': 'AI cannot execute money movements.'}
    payload = action.get('payload') or {}
    if kind == 'create_budget':
        month = int(payload.get('month') or date.today().month)
        year = int(payload.get('year') or date.today().year)
        currency = (payload.get('currency') or getattr(user, 'preferred_currency', None) or 'AOA').upper()[:3]
        budget = Budget.objects.create(
            user=user,
            amount=Decimal(str(payload['amount'])),
            currency=currency,
            month=month,
            year=year,
            period_type='monthly',
            description=(payload.get('description') or '')[:200],
        )
        return {'ok': True, 'type': kind, 'id': budget.id}
    if kind == 'create_goal':
        target_date = parse_date(str(payload.get('target_date') or '')) or date.today()
        currency = (payload.get('currency') or getattr(user, 'preferred_currency', None) or 'AOA').upper()[:3]
        goal = Goal.objects.create(
            user=user,
            title=(payload.get('title') or 'Savings goal')[:200],
            target_amount=Decimal(str(payload['target_amount'])),
            currency=currency,
            target_date=target_date,
            status='active',
        )
        return {'ok': True, 'type': kind, 'id': goal.id}
    if kind == 'create_expense':
        currency = (payload.get('currency') or getattr(user, 'preferred_currency', None) or 'AOA').upper()[:3]
        exp_date = parse_date(str(payload.get('date') or '')) or date.today()
        category = None
        cat_name = (payload.get('category') or '').strip()
        if cat_name:
            category = Category.objects.filter(name__iexact=cat_name, is_personal=True).first()
        expense = PersonalExpense.objects.create(
            user=user,
            amount=Decimal(str(payload['amount'])),
            currency=currency,
            description=(payload.get('description') or 'Logged via AI Copilot')[:500],
            date=exp_date,
            category=category,
        )
        return {'ok': True, 'type': kind, 'id': expense.id}
    raise ValueError('Unknown action type')
