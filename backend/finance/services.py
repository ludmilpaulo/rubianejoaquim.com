"""Financial analytics and health score computation."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import Sum
from django.utils import timezone

from .models import Budget, Debt, Goal, PersonalExpense, PersonalIncome, Sale, BusinessExpense


def _decimal(value: Decimal | None) -> Decimal:
    if value is None:
        return Decimal('0')
    return Decimal(str(value)).quantize(Decimal('0.01'))


def compute_financial_health(user, month: int | None = None, year: int | None = None) -> dict[str, Any]:
    """Score 0-100 from spending, savings, debt, budget adherence, goals."""
    today = timezone.now().date()
    month = month or today.month
    year = year or today.year

    expenses_total = _decimal(
        PersonalExpense.objects.filter(
            user=user, date__month=month, date__year=year
        ).aggregate(s=Sum('amount'))['s']
    )
    income_total = _decimal(
        PersonalIncome.objects.filter(
            user=user, date__month=month, date__year=year
        ).aggregate(s=Sum('amount'))['s']
    )

    budgets = Budget.objects.filter(user=user, month=month, year=year, period_type='monthly')
    over_budget_count = 0
    budget_total = Decimal('0')
    budget_spent = Decimal('0')
    for b in budgets:
        budget_total += b.amount
        spent = b.spent
        budget_spent += spent
        if b.amount > 0 and spent > b.amount:
            over_budget_count += 1

    active_goals = Goal.objects.filter(user=user, status='active')
    goals_on_track = 0
    for g in active_goals:
        if g.progress_percentage >= 50:
            goals_on_track += 1

    debts = Debt.objects.filter(user=user, status='active')
    debt_remaining = _decimal(sum((d.remaining_amount for d in debts), Decimal('0')))

    # Component scores (each 0-100)
    savings_rate = Decimal('0')
    if income_total > 0:
        savings_rate = max(Decimal('0'), ((income_total - expenses_total) / income_total) * 100)

    budget_score = Decimal('100')
    if budgets.exists():
        over_ratio = (Decimal(over_budget_count) / Decimal(budgets.count())) * 100
        budget_score = max(Decimal('0'), Decimal('100') - over_ratio)

    goal_score = Decimal('100')
    if active_goals.exists():
        goal_score = (Decimal(goals_on_track) / Decimal(active_goals.count())) * 100

    debt_score = Decimal('100')
    if debt_remaining > 0 and income_total > 0:
        debt_ratio = min((debt_remaining / income_total) * 100, Decimal('100'))
        debt_score = max(Decimal('0'), Decimal('100') - debt_ratio)

    spending_score = Decimal('100')
    if income_total > 0 and expenses_total > income_total:
        overspend = min(((expenses_total - income_total) / income_total) * 100, Decimal('100'))
        spending_score = max(Decimal('0'), Decimal('100') - overspend)

    overall = (
        spending_score * Decimal('0.25')
        + budget_score * Decimal('0.25')
        + goal_score * Decimal('0.20')
        + debt_score * Decimal('0.15')
        + min(savings_rate, Decimal('100')) * Decimal('0.15')
    ).quantize(Decimal('0.1'))

    grade = 'excellent'
    if overall < 40:
        grade = 'critical'
    elif overall < 55:
        grade = 'needs_attention'
    elif overall < 70:
        grade = 'fair'
    elif overall < 85:
        grade = 'good'

    tips: list[str] = []
    if expenses_total > income_total and income_total > 0:
        tips.append('expenses_exceed_income')
    if over_budget_count > 0:
        tips.append('budget_exceeded')
    if debt_remaining > 0:
        tips.append('active_debt')
    if active_goals.exists() and goals_on_track == 0:
        tips.append('goals_need_contribution')

    return {
        'score': float(overall),
        'grade': grade,
        'month': month,
        'year': year,
        'income': float(income_total),
        'expenses': float(expenses_total),
        'balance': float(income_total - expenses_total),
        'debt_remaining': float(debt_remaining),
        'components': {
            'spending': float(spending_score),
            'budget': float(budget_score),
            'goals': float(goal_score),
            'debt': float(debt_score),
            'savings': float(min(savings_rate, Decimal('100'))),
        },
        'tips': tips,
    }


def build_dashboard(user) -> dict[str, Any]:
    """Aggregated home dashboard payload."""
    today = timezone.now().date()
    month, year = today.month, today.year

    health = compute_financial_health(user, month, year)

    from tasks.models import Task, Notification

    expenses_by_cat = (
        PersonalExpense.objects.filter(user=user, date__month=month, date__year=year)
        .values('category__name', 'category__color')
        .annotate(total=Sum('amount'))
        .order_by('-total')[:5]
    )

    active_goals = Goal.objects.filter(user=user, status='active').order_by('-updated_at')[:3]
    active_debts = Debt.objects.filter(user=user, status='active').order_by('due_date')[:3]
    budgets = Budget.objects.filter(user=user, month=month, year=year, period_type='monthly')[:5]

    today_tasks = Task.objects.filter(
        user=user, due_date=today, status__in=['pending', 'in_progress']
    ).count()
    unread_notifications = Notification.objects.filter(user=user, is_read=False).count()

    business_sales = _decimal(
        Sale.objects.filter(user=user, date__month=month, date__year=year).aggregate(s=Sum('amount'))['s']
    )
    business_expenses = _decimal(
        BusinessExpense.objects.filter(user=user, date__month=month, date__year=year).aggregate(s=Sum('amount'))['s']
    )

    record_health_snapshot(user, health)

    return {
        'health': health,
        'month': month,
        'year': year,
        'currency': getattr(user, 'preferred_currency', 'AOA') or 'AOA',
        'summary': {
            'income': health['income'],
            'expenses': health['expenses'],
            'balance': health['balance'],
            'business_profit': float(business_sales - business_expenses),
        },
        'expenses_by_category': [
            {
                'name': row['category__name'] or 'Other',
                'color': row['category__color'] or '#6366f1',
                'total': float(row['total'] or 0),
            }
            for row in expenses_by_cat
        ],
        'goals': [
            {
                'id': g.id,
                'title': g.title,
                'current_amount': float(g.current_amount),
                'target_amount': float(g.target_amount),
                'progress_percentage': float(g.progress_percentage),
                'target_date': g.target_date.isoformat(),
            }
            for g in active_goals
        ],
        'debts': [
            {
                'id': d.id,
                'creditor': d.creditor,
                'remaining_amount': float(d.remaining_amount),
                'due_date': d.due_date.isoformat(),
                'progress_percentage': float(d.progress_percentage),
            }
            for d in active_debts
        ],
        'budgets': [
            {
                'id': b.id,
                'category': b.category.name if b.category else None,
                'amount': float(b.amount),
                'spent': float(b.spent),
                'remaining': float(b.remaining),
                'percentage_used': float(b.percentage_used),
            }
            for b in budgets
        ],
        'tasks_today': today_tasks,
        'unread_notifications': unread_notifications,
    }


def record_health_snapshot(user, health: dict[str, Any]) -> None:
    from .models import FinancialHealthSnapshot

    FinancialHealthSnapshot.objects.update_or_create(
        user=user,
        month=health['month'],
        year=health['year'],
        defaults={
            'score': health['score'],
            'grade': health['grade'],
            'components': health.get('components', {}),
        },
    )


def get_health_history(user, months: int = 6) -> list[dict[str, Any]]:
    from .models import FinancialHealthSnapshot

    qs = FinancialHealthSnapshot.objects.filter(user=user).order_by('-year', '-month')[:months]
    return [
        {
            'month': s.month,
            'year': s.year,
            'score': float(s.score),
            'grade': s.grade,
            'components': s.components,
        }
        for s in reversed(list(qs))
    ]


def build_analytics(user) -> dict[str, Any]:
    """Debt payoff timeline, savings projection, spending forecast."""
    today = timezone.now().date()
    month, year = today.month, today.year

    debts = Debt.objects.filter(user=user, status='active')
    debt_timelines = []
    for d in debts:
        remaining = float(d.remaining_amount)
        balance = remaining
        timeline = []
        month_idx = 0
        while balance > 0.01 and month_idx < 48:
            payment = max(balance * 0.1, min(500, balance))
            balance = max(0, balance - payment)
            timeline.append({'month': month_idx + 1, 'balance': round(balance, 2)})
            month_idx += 1
        debt_timelines.append({
            'id': d.id,
            'creditor': d.creditor,
            'remaining': remaining,
            'months_to_payoff': len(timeline),
            'timeline': timeline[:24],
        })

    goals = Goal.objects.filter(user=user, status='active')
    savings_projection = []
    for g in goals:
        remaining = float(g.target_amount) - float(g.current_amount)
        monthly_need = remaining / 6 if remaining > 0 else 0
        savings_projection.append({
            'id': g.id,
            'title': g.title,
            'remaining': round(remaining, 2),
            'suggested_monthly': round(monthly_need, 2),
            'projected_completion_months': 6 if monthly_need > 0 else 0,
        })

    # 3-month average expenses forecast
    forecast = []
    for i in range(3):
        m = month - i
        y = year
        if m <= 0:
            m += 12
            y -= 1
        total = _decimal(
            PersonalExpense.objects.filter(user=user, date__month=m, date__year=y).aggregate(s=Sum('amount'))['s']
        )
        forecast.append({'month': m, 'year': y, 'projected_expenses': float(total)})
    forecast.reverse()

    health = compute_financial_health(user, month, year)
    return {
        'debt_payoff': debt_timelines,
        'savings_projection': savings_projection,
        'spending_forecast': forecast,
        'health': health,
    }


def process_receipt_ocr(receipt) -> None:
    """Lightweight OCR stub: extract amount from filename or notes until full OCR service."""
    import re

    text = receipt.scanned_text or ''
    if receipt.file and not text:
        text = receipt.file.name
    match = re.search(r'(\d+[.,]\d{2})', text.replace(',', '.'))
    if match and not receipt.amount:
        try:
            receipt.amount = Decimal(match.group(1).replace(',', '.'))
        except Exception:
            pass
    if not receipt.merchant and receipt.file:
        receipt.merchant = receipt.file.name.split('/')[-1][:80]
    receipt.status = 'processed'
    receipt.save(update_fields=['amount', 'merchant', 'status'])
