"""Admin analytics, filtering and export helpers for Zenda subscriptions."""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, Q, Prefetch
from django.utils import timezone
from django.utils.dateparse import parse_date

from .models import MobileAppSubscription, MobileAppSubscriptionPaymentProof
from .tiers import PLAN_TIERS


def monthly_price():
    from .billing import monthly_price_aoa
    return monthly_price_aoa()


def default_currency():
    return 'AOA'


def effective_amount(proof=None):
    if proof is not None and proof.amount is not None:
        return Decimal(proof.amount)
    return monthly_price()


def effective_currency(proof=None):
    if proof is not None and proof.currency:
        return proof.currency
    return default_currency()


def _pct_change(current, previous):
    current = float(current)
    previous = float(previous)
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / previous * 100, 1)


def parse_range(value):
    mapping = {
        '7d': 7,
        '30d': 30,
        '3m': 90,
        '6m': 180,
        '12m': 365,
    }
    return mapping.get(value or '6m', 180)


def apply_subscription_filters(qs, params):
    status_filter = params.get('status')
    if status_filter == 'payment_failed':
        qs = qs.filter(status='expired', payment_proofs__status='rejected').distinct()
    elif status_filter:
        qs = qs.filter(status=status_filter)

    plan = params.get('plan') or params.get('plan_tier')
    if plan:
        qs = qs.filter(plan_tier=plan)

    payment_status = params.get('payment_status')
    if payment_status == 'paid':
        qs = qs.filter(payment_proofs__status='approved').distinct()
    elif payment_status == 'pending':
        qs = qs.filter(payment_proofs__status__in=['pending', 'info_requested']).distinct()
    elif payment_status == 'failed':
        qs = qs.filter(payment_proofs__status='rejected').distinct()
    elif payment_status == 'none':
        qs = qs.filter(payment_proofs__isnull=True)

    currency = params.get('currency')
    if currency:
        qs = qs.filter(
            Q(payment_proofs__currency__iexact=currency) | Q(payment_proofs__isnull=True)
        ).distinct()

    search = (params.get('q') or params.get('search') or '').strip()
    if search:
        q_filter = (
            Q(user__email__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(user__username__icontains=search)
            | Q(user__phone__icontains=search)
        )
        if search.isdigit():
            q_filter |= Q(id=int(search))
            q_filter |= Q(payment_proofs__id=int(search))
        qs = qs.filter(q_filter).distinct()

    date_from = parse_date(params.get('date_from') or '')
    date_to = parse_date(params.get('date_to') or '')
    date_field = params.get('date_field') or 'created'
    if date_from or date_to:
        if date_field == 'renewal':
            lookup = 'subscription_ends_at'
        elif date_field == 'payment':
            lookup = 'payment_proofs__created_at'
        else:
            lookup = 'created_at'
        if date_from:
            qs = qs.filter(**{f'{lookup}__date__gte': date_from})
        if date_to:
            qs = qs.filter(**{f'{lookup}__date__lte': date_to})
        if date_field == 'payment':
            qs = qs.distinct()

    expiring = params.get('expiring')
    if expiring in ('1', 'true', '7'):
        now = timezone.now()
        until = now + timedelta(days=7)
        qs = qs.filter(
            status__in=['trial', 'active'],
        ).filter(
            Q(status='active', subscription_ends_at__gte=now, subscription_ends_at__lte=until)
            | Q(status='trial', trial_ends_at__gte=now, trial_ends_at__lte=until)
        )

    failed_today = params.get('failed_today')
    if failed_today in ('1', 'true'):
        today = timezone.now().date()
        qs = qs.filter(payment_proofs__status='rejected', payment_proofs__reviewed_at__date=today).distinct()

    return qs


def subscription_queryset():
    latest_proofs = MobileAppSubscriptionPaymentProof.objects.order_by('-created_at')
    return (
        MobileAppSubscription.objects.select_related('user')
        .prefetch_related(Prefetch('payment_proofs', queryset=latest_proofs))
        .order_by('-created_at')
    )


def _daily_counts(qs, field, days, now):
    series = []
    for i in range(days - 1, -1, -1):
        day = (now - timedelta(days=i)).date()
        series.append(qs.filter(**{f'{field}__date': day}).count())
    return series


def build_analytics(revenue_range='6m'):
    now = timezone.now()
    today = now.date()
    month_start = today.replace(day=1)
    prev_month_end = month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)
    last_30 = now - timedelta(days=30)
    prev_30 = now - timedelta(days=60)
    in_7 = now + timedelta(days=7)

    subs = MobileAppSubscription.objects.all()
    proofs = MobileAppSubscriptionPaymentProof.objects.all()
    price = monthly_price()
    currency = default_currency()

    total_users = subs.count()
    new_users = subs.filter(created_at__gte=last_30).count()
    prev_new_users = subs.filter(created_at__gte=prev_30, created_at__lt=last_30).count()
    active = subs.filter(status='active').count()

    approved_this_month = proofs.filter(status='approved', reviewed_at__date__gte=month_start)
    approved_prev_month = proofs.filter(
        status='approved',
        reviewed_at__date__gte=prev_month_start,
        reviewed_at__date__lte=prev_month_end,
    )
    monthly_revenue = approved_this_month.count() * price
    prev_revenue = approved_prev_month.count() * price

    expiring_qs = subs.filter(status__in=['trial', 'active']).filter(
        Q(status='active', subscription_ends_at__gte=now, subscription_ends_at__lte=in_7)
        | Q(status='trial', trial_ends_at__gte=now, trial_ends_at__lte=in_7)
    )
    expiring_soon = expiring_qs.count()

    failed_today = proofs.filter(status='rejected', reviewed_at__date=today).count()
    expired = subs.filter(status='expired').count()

    days = parse_range(revenue_range)
    start = now - timedelta(days=days)
    approved = proofs.filter(status='approved', reviewed_at__gte=start)

    revenue_series = []
    if days <= 30:
        cursor = start.date()
        while cursor <= today:
            count = approved.filter(reviewed_at__date=cursor).count()
            revenue_series.append({
                'period': cursor.isoformat(),
                'label': cursor.strftime('%d %b'),
                'amount': float(count * price),
                'count': count,
            })
            cursor += timedelta(days=1)
    else:
        cursor = start.date().replace(day=1)
        while cursor <= today:
            if cursor.month == 12:
                nxt = cursor.replace(year=cursor.year + 1, month=1)
            else:
                nxt = cursor.replace(month=cursor.month + 1)
            count = approved.filter(reviewed_at__date__gte=cursor, reviewed_at__date__lt=nxt).count()
            revenue_series.append({
                'period': cursor.isoformat(),
                'label': cursor.strftime('%b'),
                'amount': float(count * price),
                'count': count,
            })
            cursor = nxt

    plan_counts = {
        row['plan_tier']: row['c']
        for row in subs.values('plan_tier').annotate(c=Count('id'))
    }
    plan_total = sum(plan_counts.values()) or 1
    plan_performance = []
    for plan in PLAN_TIERS:
        users = plan_counts.get(plan, 0)
        plan_performance.append({
            'plan': plan,
            'users': users,
            'pct': round(users * 100 / plan_total, 1),
        })

    proof_counts = {
        row['status']: row['c']
        for row in proofs.values('status').annotate(c=Count('id'))
    }

    return {
        'kpis': {
            'total_users': {
                'value': total_users,
                'change_pct': _pct_change(new_users, prev_new_users),
                'sparkline': _daily_counts(subs, 'created_at', 7, now),
            },
            'active_subscriptions': {
                'value': active,
                'change_pct': _pct_change(
                    subs.filter(status='active', created_at__gte=last_30).count(),
                    subs.filter(status='active', created_at__gte=prev_30, created_at__lt=last_30).count(),
                ),
                'sparkline': _daily_counts(subs.filter(status='active'), 'updated_at', 7, now),
            },
            'monthly_revenue': {
                'value': float(monthly_revenue),
                'currency': currency,
                'change_pct': _pct_change(monthly_revenue, prev_revenue),
                'sparkline': [
                    float(proofs.filter(status='approved', reviewed_at__date=(now - timedelta(days=i)).date()).count() * price)
                    for i in range(6, -1, -1)
                ],
            },
            'expiring_soon': {
                'value': expiring_soon,
                'change_pct': None,
                'sparkline': [],
            },
        },
        'revenue_series': revenue_series,
        'plan_performance': plan_performance,
        'proofs': {
            'pending': proof_counts.get('pending', 0),
            'approved': proof_counts.get('approved', 0),
            'rejected': proof_counts.get('rejected', 0),
            'info_requested': proof_counts.get('info_requested', 0),
        },
        'alerts': {
            'expiring_7_days': expiring_soon,
            'failed_payments_today': failed_today,
            'expired': expired,
        },
        'pricing': {
            'monthly_price': float(price),
            'currency': currency,
        },
    }


def apply_proof_filters(qs, params):
    status_filter = params.get('status')
    if status_filter:
        qs = qs.filter(status=status_filter)
    search = (params.get('q') or params.get('search') or '').strip()
    if search:
        q_filter = (
            Q(subscription__user__email__icontains=search)
            | Q(subscription__user__first_name__icontains=search)
            | Q(subscription__user__last_name__icontains=search)
            | Q(subscription__user__phone__icontains=search)
            | Q(notes__icontains=search)
            | Q(payment_reference__icontains=search)
        )
        if search.isdigit():
            q_filter |= Q(id=int(search))
            q_filter |= Q(subscription_id=int(search))
        qs = qs.filter(q_filter)
    return qs
