"""Financial analytics and health score computation."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from django.db.models import Sum, Q
from django.utils import timezone

from .fx import convert_amount, sum_in_currency
from .models import Budget, Category, Debt, Goal, PersonalExpense, PersonalIncome, Sale, BusinessExpense


def _decimal(value: Decimal | None) -> Decimal:
    if value is None:
        return Decimal('0')
    return Decimal(str(value)).quantize(Decimal('0.01'))


def _preferred(user) -> str:
    return (getattr(user, 'preferred_currency', None) or 'AOA').upper()


def _sum_queryset_amounts(qs, *, amount_field='amount', currency_field='currency', target: str) -> Decimal:
    rows = [
        (getattr(obj, amount_field), getattr(obj, currency_field, None) or target)
        for obj in qs.only(amount_field, currency_field)
    ]
    return sum_in_currency(rows, target)


def compute_financial_health(user, month: int | None = None, year: int | None = None) -> dict[str, Any]:
    """Score 0-100 from spending, savings, debt, budget adherence, goals."""
    today = timezone.now().date()
    month = month or today.month
    year = year or today.year
    preferred = _preferred(user)

    expenses_total = _sum_queryset_amounts(
        PersonalExpense.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    income_total = _sum_queryset_amounts(
        PersonalIncome.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )

    budgets = Budget.objects.filter(user=user, month=month, year=year, period_type='monthly')
    over_budget_count = 0
    budget_total = Decimal('0')
    budget_spent = Decimal('0')
    for b in budgets:
        b_cur = (b.currency or preferred).upper()
        # Convert budget envelope into preferred for health aggregates
        b_amt = convert_amount(b.amount, b_cur, preferred)
        budget_total += b_amt['converted_amount'] if b_amt else _decimal(b.amount)
        spent = b.spent  # already in budget currency
        spent_pref = convert_amount(spent, b_cur, preferred)
        budget_spent += spent_pref['converted_amount'] if spent_pref else _decimal(spent)
        if b.amount > 0 and spent > b.amount:
            over_budget_count += 1

    active_goals = Goal.objects.filter(user=user, status='active')
    goals_on_track = 0
    for g in active_goals:
        if g.progress_percentage >= 50:
            goals_on_track += 1

    debts = Debt.objects.filter(user=user, status='active')
    debt_remaining = Decimal('0')
    for d in debts:
        rem = convert_amount(d.remaining_amount, d.currency or preferred, preferred)
        debt_remaining += rem['converted_amount'] if rem else _decimal(d.remaining_amount)
    debt_remaining = _decimal(debt_remaining)

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
    """Aggregated home dashboard payload (amounts in preferred_currency where aggregated)."""
    today = timezone.now().date()
    month, year = today.month, today.year
    preferred = _preferred(user)

    health = compute_financial_health(user, month, year)

    from tasks.models import Task, Notification

    # Category totals: convert each expense into preferred before grouping
    cat_totals: dict[tuple[str, str], Decimal] = {}
    for exp in PersonalExpense.objects.filter(
        user=user, date__month=month, date__year=year
    ).select_related('category').only('amount', 'currency', 'category__name', 'category__color'):
        name = exp.category.name if exp.category else 'Other'
        color = (exp.category.color if exp.category else None) or '#6366f1'
        key = (name, color)
        converted = convert_amount(exp.amount, exp.currency or preferred, preferred)
        amt = converted['converted_amount'] if converted else _decimal(exp.amount)
        cat_totals[key] = cat_totals.get(key, Decimal('0')) + amt
    expenses_by_cat = sorted(
        (
            {'name': name, 'color': color, 'total': float(total)}
            for (name, color), total in cat_totals.items()
        ),
        key=lambda row: row['total'],
        reverse=True,
    )[:5]

    active_goals = Goal.objects.filter(user=user, status='active').order_by('-updated_at')[:3]
    active_debts = Debt.objects.filter(user=user, status='active').order_by('due_date')[:3]
    budgets = Budget.objects.filter(user=user, month=month, year=year, period_type='monthly')[:5]

    today_tasks = Task.objects.filter(
        user=user, due_date=today, status__in=['pending', 'in_progress']
    ).count()
    unread_notifications = Notification.objects.filter(user=user, is_read=False).count()

    business_sales = _sum_queryset_amounts(
        Sale.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    business_expenses = _sum_queryset_amounts(
        BusinessExpense.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )

    record_health_snapshot(user, health)

    return {
        'health': health,
        'month': month,
        'year': year,
        'currency': preferred,
        'summary': {
            'income': health['income'],
            'expenses': health['expenses'],
            'balance': health['balance'],
            'business_profit': float(business_sales - business_expenses),
        },
        'expenses_by_category': expenses_by_cat,
        'goals': [
            {
                'id': g.id,
                'title': g.title,
                'current_amount': float(g.current_amount),
                'target_amount': float(g.target_amount),
                'progress_percentage': float(g.progress_percentage),
                'target_date': g.target_date.isoformat(),
                'currency': g.currency,
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
                'currency': d.currency,
            }
            for d in active_debts
        ],
        'budgets': [
            {
                'id': b.id,
                'category': b.category.name if b.category else None,
                'amount': float(b.amount),
                'spent': float(b.spent),
                'currency': b.currency,
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

    # 3-month average expenses forecast (converted to preferred)
    preferred = _preferred(user)
    forecast = []
    for i in range(3):
        m = month - i
        y = year
        if m <= 0:
            m += 12
            y -= 1
        total = _sum_queryset_amounts(
            PersonalExpense.objects.filter(user=user, date__month=m, date__year=y),
            target=preferred,
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
    """Parse scanned_text via receipt_parser and update receipt fields.

    Do not treat the uploaded filename as OCR text. If on-device text is empty
    or the parse has no total, optionally run OpenAI vision (when configured).
    """
    from .receipt_parser import parse_receipt_text
    from .receipt_vision import extract_receipt_with_vision

    text = (receipt.scanned_text or '').strip()
    default_currency = getattr(receipt.user, 'preferred_currency', None) or 'AOA'
    parsed = parse_receipt_text(text, default_currency=default_currency)

    needs_vision = (not text) or parsed.get('amount') is None or parsed.get('status') in (
        'failed',
        'low_confidence',
    )
    if needs_vision:
        vision = extract_receipt_with_vision(receipt)
        if vision:
            if vision.get('raw_text') and not text:
                receipt.scanned_text = vision['raw_text']
                text = vision['raw_text']
                parsed = parse_receipt_text(text, default_currency=default_currency)
            if parsed.get('amount') is None and vision.get('amount') is not None:
                parsed['amount'] = vision['amount']
                parsed['status'] = 'low_confidence' if vision.get('confidence', 0) < 0.6 else 'processed'
                parsed['confidence_score'] = Decimal(str(round(vision.get('confidence') or 0.5, 3)))
            if vision.get('currency') and (not parsed.get('currency') or parsed.get('status') != 'processed'):
                parsed['currency'] = vision['currency']
            if vision.get('merchant') and not parsed.get('merchant'):
                parsed['merchant'] = vision['merchant']
            if vision.get('date') and not parsed.get('receipt_date'):
                from datetime import date as date_cls

                try:
                    parsed['receipt_date'] = date_cls.fromisoformat(vision['date'])
                except ValueError:
                    pass
            if not text:
                parsed['status'] = parsed.get('status') or 'low_confidence'

    receipt.merchant = parsed.get('merchant') or receipt.merchant
    if parsed.get('amount') is not None:
        receipt.amount = parsed['amount']
    receipt.currency = parsed.get('currency') or receipt.currency
    receipt.receipt_date = parsed.get('receipt_date')
    receipt.receipt_time = parsed.get('receipt_time')
    receipt.tax_amount = parsed.get('tax_amount')
    receipt.receipt_number = parsed.get('receipt_number') or ''
    receipt.items = parsed.get('items') or []
    if parsed.get('payment_method'):
        receipt.payment_method = parsed['payment_method']
    receipt.suggested_category = parsed.get('suggested_category') or ''
    receipt.confidence_score = parsed.get('confidence_score')
    receipt.status = parsed.get('status') or 'failed'
    receipt.save(
        update_fields=[
            'merchant', 'amount', 'currency', 'receipt_date', 'receipt_time',
            'tax_amount', 'receipt_number', 'items', 'payment_method',
            'suggested_category', 'confidence_score', 'status', 'scanned_text',
            'updated_at',
        ]
    )


def apply_expense_fx_snapshot(expense, user) -> None:
    """Store immutable FX conversion into user's preferred currency."""
    from django.utils import timezone as tz

    display = (getattr(user, 'preferred_currency', None) or expense.currency or 'AOA').upper()
    expense.display_currency = display
    src = (expense.currency or display).upper()
    if src == display:
        expense.exchange_rate = Decimal('1')
        expense.converted_amount = Decimal(str(expense.amount)).quantize(Decimal('0.01'))
        expense.exchange_rate_source = 'identity'
        expense.exchange_rate_timestamp = tz.now()
    else:
        fx = convert_amount(expense.amount, src, display)
        if fx:
            expense.exchange_rate = fx['rate']
            expense.converted_amount = fx['converted_amount']
            expense.exchange_rate_source = fx.get('source') or ''
            expense.exchange_rate_timestamp = fx.get('provider_updated_at') or tz.now()
    expense.save(
        update_fields=[
            'display_currency', 'exchange_rate', 'converted_amount',
            'exchange_rate_source', 'exchange_rate_timestamp', 'updated_at',
        ]
    )


def create_expense_from_receipt(
    receipt,
    *,
    category_id: int | None = None,
    budget_id: int | None = None,
    description: str | None = None,
    amount=None,
    currency: str | None = None,
    expense_date=None,
    payment_method: str | None = None,
    confirmed_low_confidence: bool = False,
) -> tuple[PersonalExpense, list[dict]]:
    """Create PersonalExpense from receipt and link; returns expense + budget alerts."""
    from finance.budget_alerts import maybe_emit_budget_alerts, maybe_emit_category_budget_alerts

    if receipt.linked_expense_id:
        raise ValueError('Receipt already linked to an expense')

    if receipt.status == 'low_confidence' and not confirmed_low_confidence:
        raise ValueError('Low confidence total — user confirmation required')

    if receipt.status == 'failed' or receipt.amount is None:
        raise ValueError('Receipt has no valid amount')

    final_amount = Decimal(str(amount)) if amount is not None else receipt.amount
    final_currency = (currency or receipt.currency or 'AOA').upper()
    final_date = expense_date or receipt.receipt_date or timezone.now().date()
    final_payment = payment_method or receipt.payment_method or 'cash'
    desc = description or receipt.merchant or 'Receipt expense'

    category = None
    if category_id:
        category = Category.objects.filter(
            Q(user=receipt.user) | Q(user__isnull=True),
            id=category_id,
        ).first()

    budget = None
    if budget_id:
        budget = Budget.objects.filter(user=receipt.user, id=budget_id).first()

    expense = PersonalExpense.objects.create(
        user=receipt.user,
        category=category,
        budget=budget,
        amount=final_amount,
        currency=final_currency,
        description=desc,
        date=final_date,
        payment_method=final_payment,
        notes=receipt.receipt_number or '',
    )
    apply_expense_fx_snapshot(expense, receipt.user)

    receipt.linked_expense = expense
    if category:
        receipt.category = category
    receipt.save(update_fields=['linked_expense', 'category', 'updated_at'])

    alerts: list[dict] = []
    try:
        alerts.extend(maybe_emit_budget_alerts(receipt.user, month=final_date.month, year=final_date.year))
        if budget:
            alerts.extend(maybe_emit_category_budget_alerts(receipt.user, budget))
    except Exception:
        pass

    return expense, alerts


def build_transaction_history(user, *, filters: dict | None = None) -> list[dict]:
    """Unified expense + receipt history for filtering."""
    from finance.receipt_storage import get_receipt_file_url

    filters = filters or {}
    qs = PersonalExpense.objects.filter(user=user).select_related('category', 'budget').prefetch_related('receipts')

    if filters.get('date_from') and filters.get('date_to'):
        qs = qs.filter(date__gte=filters['date_from'], date__lte=filters['date_to'])
    if filters.get('month'):
        qs = qs.filter(date__month=int(filters['month']))
    if filters.get('year'):
        qs = qs.filter(date__year=int(filters['year']))
    if filters.get('category'):
        qs = qs.filter(category_id=filters['category'])
    if filters.get('budget'):
        qs = qs.filter(budget_id=filters['budget'])
    if filters.get('currency'):
        qs = qs.filter(currency__iexact=filters['currency'])
    if filters.get('payment_method'):
        qs = qs.filter(payment_method=filters['payment_method'])
    if filters.get('merchant'):
        qs = qs.filter(
            Q(description__icontains=filters['merchant'])
            | Q(receipts__merchant__icontains=filters['merchant'])
        ).distinct()
    if filters.get('amount_min'):
        qs = qs.filter(amount__gte=Decimal(str(filters['amount_min'])))
    if filters.get('amount_max'):
        qs = qs.filter(amount__lte=Decimal(str(filters['amount_max'])))

    rows: list[dict] = []
    for exp in qs.order_by('-date', '-created_at')[:500]:
        receipt = exp.receipts.first()
        rows.append({
            'id': exp.id,
            'type': 'expense',
            'merchant': receipt.merchant if receipt else exp.description,
            'description': exp.description,
            'date': str(exp.date),
            'original_amount': str(exp.amount),
            'original_currency': exp.currency,
            'converted_amount': str(exp.converted_amount) if exp.converted_amount else None,
            'display_currency': exp.display_currency or None,
            'exchange_rate': str(exp.exchange_rate) if exp.exchange_rate else None,
            'exchange_rate_source': exp.exchange_rate_source or None,
            'exchange_rate_timestamp': (
                exp.exchange_rate_timestamp.isoformat() if exp.exchange_rate_timestamp else None
            ),
            'category_id': exp.category_id,
            'category_name': exp.category.name if exp.category else None,
            'budget_id': exp.budget_id,
            'payment_method': exp.payment_method,
            'receipt_id': receipt.id if receipt else None,
            'receipt_status': receipt.status if receipt else None,
        })
    return rows

