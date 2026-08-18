"""Budget alert helpers for monthly spending limits."""
from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from finance.budget_alert_i18n import budget_alert_level, t


def _prefs(user) -> dict:
    raw = getattr(user, 'notification_prefs', None) or {}
    if not isinstance(raw, dict):
        return {}
    return raw


def prefs_enabled(user, key: str, default: bool = True) -> bool:
    prefs = _prefs(user)
    if prefs.get('enabled') is False:
        return False
    return bool(prefs.get(key, default))


def month_actual_expenses(user, month: int, year: int, *, target_currency: str | None = None) -> Decimal:
    """Sum personal expenses converted into target_currency (plan or preferred)."""
    from finance.fx import sum_in_currency
    from finance.models import PersonalExpense

    preferred = (target_currency or getattr(user, 'preferred_currency', None) or 'AOA').upper()
    rows = [
        (exp.amount, exp.currency or preferred)
        for exp in PersonalExpense.objects.filter(
            user=user,
            date__month=month,
            date__year=year,
        ).only('amount', 'currency')
    ]
    return sum_in_currency(rows, preferred)


def compute_plan_progress(plan) -> dict:
    """Return spending progress vs spending_limit for a MonthlyFinancialPlan."""
    plan_currency = (plan.currency or 'AOA').upper()
    actual = month_actual_expenses(plan.user, plan.month, plan.year, target_currency=plan_currency)
    limit = Decimal(str(plan.spending_limit or 0))
    salary = Decimal(str(plan.salary or 0))
    savings_target = Decimal(str(plan.savings_target or 0))
    planned = plan.planned_expenses_total
    planned_savings = plan.planned_savings

    remaining = (limit - actual) if limit > 0 else (salary - actual)
    percent = Decimal('0.00')
    if limit > 0:
        percent = ((actual / limit) * Decimal('100')).quantize(Decimal('0.01'))

    status = 'ok'
    if limit > 0:
        if actual > limit:
            status = 'exceeded'
        elif percent >= Decimal('100'):
            status = 'at_limit'
        elif percent >= Decimal('80'):
            status = 'warning'

    return {
        'salary': str(salary),
        'spending_limit': str(limit),
        'savings_target': str(savings_target),
        'planned_expenses': str(planned),
        'planned_needs': str(plan.planned_needs),
        'planned_wants': str(plan.planned_wants),
        'planned_savings': str(planned_savings),
        'actual_expenses': str(actual),
        'actual_savings': str(max(salary - actual, Decimal('0')).quantize(Decimal('0.01'))),
        'remaining': str(remaining.quantize(Decimal('0.01'))),
        'percent_used': str(percent),
        'status': status,
        'currency': plan_currency,
        'month': plan.month,
        'year': plan.year,
    }


def _alert_level(percent: Decimal, actual: Decimal, limit: Decimal) -> int:
    return budget_alert_level(percent, actual, limit)


def maybe_emit_category_budget_alerts(user, budget) -> list[dict]:
    """Per-budget alerts at 70/80/90/100/exceeded thresholds."""
    from finance.models import Budget
    from tasks.models import Notification

    if not isinstance(budget, Budget) or not budget.amount:
        return []

    spent = budget.spent
    limit = Decimal(str(budget.amount))
    if limit <= 0:
        return []

    percent = ((spent / limit) * Decimal('100')).quantize(Decimal('0.01'))
    level = budget_alert_level(percent, spent, limit)
    prev = budget.last_budget_alert_level or 0
    if level == 0 or level <= prev:
        return []

    name = budget.category.name if budget.category else budget.description or 'Budget'
    currency = (budget.currency or 'AOA').upper()
    remaining = (limit - spent).quantize(Decimal('0.01'))
    over = (spent - limit).quantize(Decimal('0.01'))
    created: list[dict] = []

    thresholds = [
        (70, 'budget_warning_70', 'budget_warning'),
        (80, 'budget_warning_80', 'budget_warning'),
        (90, 'budget_warning_90', 'budget_warning'),
        (100, 'budget_at_limit', 'budget_at_limit'),
        (101, 'budget_exceeded', 'budget_exceeded'),
    ]

    for thresh, msg_key, ntype in thresholds:
        if level >= thresh and prev < thresh:
            if not prefs_enabled(user, 'budget_warnings' if thresh < 101 else 'budget_exceeded', True):
                continue
            kwargs = {'name': name, 'remaining': str(remaining), 'currency': currency}
            if thresh >= 101:
                kwargs = {'name': name, 'over': str(over), 'currency': currency}
            message = t(user, msg_key, **kwargs)
            title = t(user, msg_key, **kwargs)[:120]
            n = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=ntype,
                related_object_type='budget',
                related_object_id=budget.id,
                action_url=f'zenda://personal?initialTab=budgets',
            )
            created.append({
                'id': n.id,
                'level': thresh,
                'type': ntype,
                'title': title,
                'message': message,
                'budget_id': budget.id,
                'percent_used': str(percent),
                'currency': currency,
            })

    if created:
        budget.last_budget_alert_level = level
        budget.save(update_fields=['last_budget_alert_level', 'updated_at'])

    return created


def maybe_emit_budget_alerts(user, *, month: int | None = None, year: int | None = None) -> list[dict]:
    """
    Create in-app notifications when crossing 80% / 100% / over thresholds.
    Returns list of alerts created (for mobile to mirror as local notifications).
    Respects user notification_prefs; never bypasses OS controls (server-side only creates records).
    """
    from finance.models import MonthlyFinancialPlan
    from tasks.models import Notification

    now = timezone.now().date()
    month = month or now.month
    year = year or now.year

    plan = MonthlyFinancialPlan.objects.filter(user=user, month=month, year=year).first()
    if not plan or not plan.spending_limit:
        return []

    progress = compute_plan_progress(plan)
    actual = Decimal(progress['actual_expenses'])
    limit = Decimal(progress['spending_limit'])
    remaining = Decimal(progress['remaining'])
    percent = Decimal(progress['percent_used'])
    currency = plan.currency
    level = _alert_level(percent, actual, limit)

    if level == 0 or level <= (plan.last_budget_alert_level or 0):
        return []

    created: list[dict] = []

    if level >= 80 and (plan.last_budget_alert_level or 0) < 80:
        if prefs_enabled(user, 'budget_warnings', True):
            title = t(user, 'monthly_warning_80', remaining=str(remaining), currency=currency)
            message = title
            # Localized titles stored as EN keys-ish; mobile can re-translate by type
            n = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type='budget_warning',
                related_object_type='monthly_plan',
                related_object_id=plan.id,
                action_url='zenda://personal/plan',
            )
            created.append({
                'id': n.id,
                'level': 80,
                'type': 'budget_warning',
                'title': title,
                'message': message,
                'remaining': str(remaining),
                'percent_used': str(percent),
                'currency': currency,
            })

    if level >= 100 and (plan.last_budget_alert_level or 0) < 100:
        if prefs_enabled(user, 'budget_exceeded', True):
            title = t(user, 'monthly_at_limit')
            message = title
            n = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type='budget_exceeded',
                related_object_type='monthly_plan',
                related_object_id=plan.id,
                action_url='zenda://personal/plan',
            )
            created.append({
                'id': n.id,
                'level': 100,
                'type': 'budget_exceeded',
                'title': title,
                'message': message,
                'remaining': str(remaining),
                'percent_used': str(percent),
                'currency': currency,
            })

    if level >= 101 and (plan.last_budget_alert_level or 0) < 101:
        if prefs_enabled(user, 'budget_exceeded', True):
            over = (actual - limit).quantize(Decimal('0.01'))
            title = t(user, 'monthly_exceeded', over=str(over), currency=currency)
            message = title
            n = Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type='budget_exceeded',
                related_object_type='monthly_plan',
                related_object_id=plan.id,
                action_url='zenda://personal/plan',
            )
            created.append({
                'id': n.id,
                'level': 101,
                'type': 'budget_exceeded_urgent',
                'title': title,
                'message': message,
                'over_by': str(over),
                'percent_used': str(percent),
                'currency': currency,
            })

    if created:
        plan.last_budget_alert_level = level
        plan.save(update_fields=['last_budget_alert_level', 'updated_at'])

    return created
