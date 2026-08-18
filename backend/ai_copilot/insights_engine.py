"""Deterministic financial patterns and health summaries for AI Copilot."""
from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.utils import timezone

from finance.fx import convert_amount
from finance.services import _preferred, _sum_queryset_amounts, compute_financial_health


def _dec(value) -> Decimal:
    try:
        return Decimal(str(value or 0)).quantize(Decimal('0.01'))
    except Exception:
        return Decimal('0.00')


def build_financial_health_summary(user) -> dict[str, Any]:
    """Structured health block from actual Zenda data — never invented."""
    today = timezone.now().date()
    month, year = today.month, today.year
    preferred = _preferred(user)

    from finance.models import Debt, PersonalExpense, PersonalIncome

    income = _sum_queryset_amounts(
        PersonalIncome.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    expenses = _sum_queryset_amounts(
        PersonalExpense.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    savings = max(income - expenses, Decimal('0'))

    debt_payments = Decimal('0')
    from finance.models import DebtPayment
    for p in DebtPayment.objects.filter(debt__user=user, payment_date__month=month, payment_date__year=year):
        fx = convert_amount(p.amount, p.currency or preferred, preferred)
        debt_payments += fx['converted_amount'] if fx else _dec(p.amount)

    available = income - expenses - debt_payments
    health = compute_financial_health(user, month, year)

    return {
        'month': month,
        'year': year,
        'currency': preferred,
        'income': str(income),
        'expenses': str(expenses),
        'savings': str(savings),
        'debt_payments': str(debt_payments),
        'available': str(available),
        'health_score': health.get('score'),
        'health_grade': health.get('grade'),
        'disclaimer': (
            'Educational overview based on your Zenda records. '
            'Not regulated financial advice.'
        ),
    }


def _category_spend_by_month(user, months_back: int = 3) -> dict[str, list[Decimal]]:
    from finance.models import PersonalExpense

    preferred = _preferred(user)
    today = timezone.now().date()
    result: dict[str, list[Decimal]] = defaultdict(list)

    for offset in range(months_back):
        m = today.month - offset
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        total_by_cat: dict[str, Decimal] = defaultdict(lambda: Decimal('0'))
        qs = PersonalExpense.objects.filter(user=user, date__month=m, date__year=y).select_related('category')
        for exp in qs:
            cat = exp.category.name if exp.category else 'Other'
            fx = convert_amount(exp.amount, exp.currency or preferred, preferred)
            total_by_cat[cat] += fx['converted_amount'] if fx else _dec(exp.amount)
        for cat, amt in total_by_cat.items():
            result[cat].append(amt)
    return result


def detect_spending_patterns(user) -> list[dict[str, Any]]:
    """Pattern detection from transaction data only."""
    from finance.models import PersonalExpense

    patterns: list[dict[str, Any]] = []
    preferred = _preferred(user)
    today = timezone.now().date()
    month, year = today.month, today.year

    # Month-over-month total change
    prev_m, prev_y = (month - 1, year) if month > 1 else (12, year - 1)
    current = _sum_queryset_amounts(
        PersonalExpense.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    previous = _sum_queryset_amounts(
        PersonalExpense.objects.filter(user=user, date__month=prev_m, date__year=prev_y),
        target=preferred,
    )
    if previous > 0:
        pct = float(((current - previous) / previous) * 100)
        if abs(pct) >= 5:
            patterns.append({
                'type': 'spending_change',
                'direction': 'up' if pct > 0 else 'down',
                'percent': round(pct, 1),
                'currency': preferred,
                'message_key': 'spending_change',
            })

    # Category vs 3-month average
    cat_data = _category_spend_by_month(user, 3)
    for cat, amounts in cat_data.items():
        if len(amounts) < 2:
            continue
        current_cat = amounts[0]
        avg = sum(amounts[1:]) / Decimal(len(amounts[1:]))
        if avg > 0 and current_cat > avg * Decimal('1.15'):
            pct = float(((current_cat - avg) / avg) * 100)
            patterns.append({
                'type': 'category_increase',
                'category': cat,
                'percent': round(pct, 1),
                'currency': preferred,
                'message_key': 'category_increase',
            })

    # Recurring payment detection (same description ±10%, ~30 day cadence)
    three_months_ago = today - timedelta(days=95)
    expenses = list(
        PersonalExpense.objects.filter(user=user, date__gte=three_months_ago)
        .order_by('description', 'date')
        .values('description', 'amount', 'currency', 'date')
    )
    by_desc: dict[str, list] = defaultdict(list)
    for e in expenses:
        key = (e['description'] or '').strip().lower()[:80]
        if key:
            by_desc[key].append(e)

    recurring = []
    for desc, rows in by_desc.items():
        if len(rows) < 2:
            continue
        amounts = [_dec(r['amount']) for r in rows]
        base = amounts[0]
        if base <= 0:
            continue
        if all(abs(a - base) / base <= Decimal('0.10') for a in amounts):
            recurring.append(desc)
    if recurring:
        patterns.append({
            'type': 'recurring_payments',
            'count': len(recurring),
            'services': recurring[:5],
            'message_key': 'recurring_payments',
        })

    # Budget runway risk
    from finance.models import Budget
    for b in Budget.objects.filter(user=user, month=month, year=year, period_type='monthly'):
        if b.amount <= 0:
            continue
        spent = b.spent
        days_elapsed = today.day
        days_in_month = monthrange(year, month)[1]
        if days_elapsed <= 0:
            continue
        daily_rate = spent / Decimal(days_elapsed)
        projected = daily_rate * Decimal(days_in_month)
        if projected > b.amount:
            over = (projected - b.amount).quantize(Decimal('0.01'))
            patterns.append({
                'type': 'budget_risk',
                'budget': b.category.name if b.category else 'Budget',
                'projected_over': str(over),
                'currency': b.currency,
                'message_key': 'budget_risk',
            })

    # Savings opportunity — top 3 discretionary categories above average
    discretionary = ['Entertainment', 'Shopping', 'Food', 'Other']
    opportunities = []
    for cat, amounts in cat_data.items():
        if cat not in discretionary or len(amounts) < 2:
            continue
        current_cat = amounts[0]
        avg = sum(amounts[1:]) / Decimal(len(amounts[1:]))
        if current_cat > avg:
            opportunities.append((cat, current_cat - avg))
    opportunities.sort(key=lambda x: x[1], reverse=True)
    if opportunities:
        total_save = sum(o[1] for o in opportunities[:3])
        patterns.append({
            'type': 'savings_opportunity',
            'categories': [o[0] for o in opportunities[:3]],
            'potential_monthly': str(total_save.quantize(Decimal('0.01'))),
            'currency': preferred,
            'message_key': 'savings_opportunity',
        })

    return patterns


def build_goal_coach(user, goal_id: int) -> dict[str, Any]:
    from finance.models import Goal

    goal = Goal.objects.filter(user=user, id=goal_id).first()
    if not goal:
        return {'error': 'goal_not_found'}

    preferred = _preferred(user)
    today = timezone.now().date()
    remaining = max(_dec(goal.target_amount) - _dec(goal.current_amount), Decimal('0'))
    currency = goal.currency or preferred

    if goal.target_date and goal.target_date > today:
        days = (goal.target_date - today).days
        months = max(Decimal(days) / Decimal('30.4375'), Decimal('0.1'))
        weeks = max(Decimal(days) / Decimal('7'), Decimal('0.1'))
    else:
        months = Decimal('12')
        weeks = Decimal('52')

    monthly_required = (remaining / months).quantize(Decimal('0.01')) if remaining > 0 else Decimal('0')
    weekly_required = (remaining / weeks).quantize(Decimal('0.01')) if remaining > 0 else Decimal('0')
    progress = float(goal.progress_percentage)

    # Projected completion at current contribution rate
    from finance.models import GoalContribution
    recent = GoalContribution.objects.filter(goal=goal).order_by('-created_at')[:3]
    avg_contrib = Decimal('0')
    if recent:
        avg_contrib = sum(_dec(c.amount) for c in recent) / Decimal(len(recent))

    projected_months = None
    if avg_contrib > 0 and remaining > 0:
        projected_months = int((remaining / avg_contrib).to_integral_value())

    shortfall = Decimal('0')
    if goal.target_date and monthly_required > avg_contrib:
        shortfall = (monthly_required - avg_contrib).quantize(Decimal('0.01'))

    return {
        'goal_id': goal.id,
        'title': goal.title,
        'target_amount': str(goal.target_amount),
        'current_amount': str(goal.current_amount),
        'remaining': str(remaining),
        'currency': currency,
        'target_date': goal.target_date.isoformat() if goal.target_date else None,
        'progress_percent': progress,
        'required_monthly': str(monthly_required),
        'required_weekly': str(weekly_required),
        'projected_completion_months': projected_months,
        'shortfall_monthly': str(shortfall),
        'disclaimer': 'Projections use your Zenda goal data only. Not guaranteed outcomes.',
    }
