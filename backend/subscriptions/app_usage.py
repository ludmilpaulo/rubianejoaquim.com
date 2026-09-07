"""Admin analytics: how mobile-app users engage with product features.

Uses existing domain write models as adoption proxies (no client event SDK required).
"""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import AppReferralEvent, DevicePushToken, User
from subscriptions.models import MobileAppSubscription


def _parse_range(revenue_range: str) -> int:
    raw = (revenue_range or '30d').strip().lower()
    if raw in ('7d', '7'):
        return 7
    if raw in ('30d', '30', '1m'):
        return 30
    if raw in ('90d', '90', '3m'):
        return 90
    if raw in ('6m', '180d'):
        return 180
    if raw in ('12m', '365d', '1y'):
        return 365
    return 30


def _safe_count(queryset) -> int:
    try:
        return int(queryset.count())
    except Exception:
        return 0


def _safe_distinct_users(queryset, field: str = 'user_id') -> int:
    try:
        return int(queryset.values(field).distinct().count())
    except Exception:
        return 0


def _feature(
    *,
    key: str,
    label: str,
    description: str,
    events: int,
    users: int,
    total_users: int,
) -> dict:
    pct = round(users * 100 / total_users, 1) if total_users else 0.0
    return {
        'key': key,
        'label': label,
        'description': description,
        'events': events,
        'users': users,
        'adoption_pct': pct,
    }


def build_app_usage_analytics(revenue_range: str = '30d') -> dict:
    """Aggregate mobile-app reach and feature adoption for admins."""
    days = _parse_range(revenue_range)
    now = timezone.now()
    start = now - timedelta(days=days)

    # Reach / activity
    active_logins = User.objects.filter(last_login__gte=start).count()
    new_users = User.objects.filter(date_joined__gte=start).count()
    onboarding_done = User.objects.filter(onboarding_completed=True).count()
    total_users = User.objects.count()

    push_tokens = DevicePushToken.objects.filter(is_active=True)
    push_total = _safe_count(push_tokens)
    push_by_platform = {
        row['platform'] or 'unknown': row['c']
        for row in push_tokens.values('platform').annotate(c=Count('id'))
    }

    subs = MobileAppSubscription.objects.all()
    sub_active = _safe_count(subs.filter(status='active'))
    sub_trial = _safe_count(subs.filter(status='trial'))
    sub_total = _safe_count(subs)

    # Feature adoption from domain writes in range
    try:
        from finance.models import (
            Budget,
            BusinessExpense,
            Debt,
            Goal,
            PersonalExpense,
            PersonalIncome,
            Receipt,
            Sale,
            UserFavoriteCurrency,
        )
    except Exception:
        Budget = BusinessExpense = Debt = Goal = None
        PersonalExpense = PersonalIncome = Receipt = Sale = UserFavoriteCurrency = None

    try:
        from ai_copilot.models import Message
    except Exception:
        Message = None

    try:
        from wallet.models import PaymentTransaction
    except Exception:
        PaymentTransaction = None

    try:
        from tasks.models import Task
    except Exception:
        Task = None

    try:
        from finance_space.models import FamilyActivity, FinanceSpaceMember
    except Exception:
        FamilyActivity = FinanceSpaceMember = None

    try:
        from courses.models import Enrollment, Progress
    except Exception:
        Enrollment = Progress = None

    try:
        from mentorship.models import MentorshipRequest
    except Exception:
        MentorshipRequest = None

    features = []

    if PersonalExpense is not None and PersonalIncome is not None:
        expense_qs = PersonalExpense.objects.filter(created_at__gte=start)
        income_qs = PersonalIncome.objects.filter(created_at__gte=start)
        events = _safe_count(expense_qs) + _safe_count(income_qs)
        users = len(
            set(expense_qs.values_list('user_id', flat=True))
            | set(income_qs.values_list('user_id', flat=True))
        )
        features.append(
            _feature(
                key='personal_finance',
                label='Finanças pessoais',
                description='Receitas e despesas registadas',
                events=events,
                users=users,
                total_users=total_users,
            )
        )

    if Budget is not None:
        qs = Budget.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='budgets',
                label='Orçamentos',
                description='Orçamentos mensais criados',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Goal is not None:
        qs = Goal.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='goals',
                label='Objectivos',
                description='Metas de poupança / objectivos',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Debt is not None:
        qs = Debt.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='debts',
                label='Dívidas',
                description='Dívidas acompanhadas na app',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Receipt is not None:
        qs = Receipt.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='receipts',
                label='Scanner de recibos',
                description='Recibos carregados / digitalizados',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Sale is not None and BusinessExpense is not None:
        sales = Sale.objects.filter(created_at__gte=start)
        bexp = BusinessExpense.objects.filter(created_at__gte=start)
        events = _safe_count(sales) + _safe_count(bexp)
        users = len(
            set(sales.values_list('user_id', flat=True))
            | set(bexp.values_list('user_id', flat=True))
        )
        features.append(
            _feature(
                key='business_finance',
                label='Finanças empresariais',
                description='Vendas e despesas de negócio',
                events=events,
                users=users,
                total_users=total_users,
            )
        )

    if UserFavoriteCurrency is not None:
        qs = UserFavoriteCurrency.objects.all()
        features.append(
            _feature(
                key='cambio',
                label='Câmbio / moedas',
                description='Utilizadores com moedas favoritas',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Message is not None:
        msg_qs = Message.objects.filter(created_at__gte=start, role='user')
        users = _safe_count(
            msg_qs.values('conversation__user_id').distinct()
        )
        features.append(
            _feature(
                key='ai_copilot',
                label='AI Copilot',
                description='Mensagens enviadas ao assistente',
                events=_safe_count(msg_qs),
                users=users,
                total_users=total_users,
            )
        )

    if FinanceSpaceMember is not None:
        members = FinanceSpaceMember.objects.filter(joined_at__gte=start)
        all_members = FinanceSpaceMember.objects.all()
        activity_events = 0
        if FamilyActivity is not None:
            activity_events = _safe_count(FamilyActivity.objects.filter(created_at__gte=start))
        features.append(
            _feature(
                key='family_finance',
                label='Finanças em família',
                description='Membros em espaços partilhados',
                events=activity_events or _safe_count(members),
                users=_safe_distinct_users(all_members),
                total_users=total_users,
            )
        )

    if PaymentTransaction is not None:
        qs = PaymentTransaction.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='wallet',
                label='Carteira',
                description='Transacções na wallet',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Task is not None:
        qs = Task.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='tasks',
                label='Tarefas',
                description='Tarefas criadas na app',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    if Enrollment is not None:
        enroll_qs = Enrollment.objects.filter(enrolled_at__gte=start)
        progress_events = 0
        if Progress is not None:
            try:
                progress_events = _safe_count(
                    Progress.objects.filter(completed=True, completed_at__gte=start)
                )
            except Exception:
                progress_events = _safe_count(Progress.objects.filter(completed=True))
        features.append(
            _feature(
                key='education',
                label='Educação / cursos',
                description='Matrículas e aulas concluídas',
                events=_safe_count(enroll_qs) + progress_events,
                users=_safe_distinct_users(enroll_qs),
                total_users=total_users,
            )
        )

    if MentorshipRequest is not None:
        qs = MentorshipRequest.objects.filter(created_at__gte=start)
        features.append(
            _feature(
                key='mentorship',
                label='Mentoria',
                description='Pedidos de mentoria',
                events=_safe_count(qs),
                users=_safe_distinct_users(qs),
                total_users=total_users,
            )
        )

    referral_qs = AppReferralEvent.objects.filter(created_at__gte=start)
    features.append(
        _feature(
            key='referrals',
            label='Referências',
            description='Eventos de partilha / instalação / registo',
            events=_safe_count(referral_qs),
            users=_safe_distinct_users(referral_qs.filter(created_user__isnull=False), 'created_user_id'),
            total_users=total_users,
        )
    )

    features.sort(key=lambda row: (row['users'], row['events']), reverse=True)

    # Daily active users (by last_login day) — coarse engagement series
    login_series = []
    try:
        rows = (
            User.objects.filter(last_login__gte=start, last_login__isnull=False)
            .annotate(day=TruncDate('last_login'))
            .values('day')
            .annotate(users=Count('id'))
            .order_by('day')
        )
        by_day = {row['day'].isoformat(): row['users'] for row in rows if row['day']}
        cursor = start.date()
        today = now.date()
        while cursor <= today:
            key = cursor.isoformat()
            login_series.append({
                'period': key,
                'label': cursor.strftime('%d %b'),
                'users': by_day.get(key, 0),
            })
            cursor += timedelta(days=1)
    except Exception:
        login_series = []

    # Top countries among recently active users
    country_rows = (
        User.objects.filter(last_login__gte=start)
        .exclude(country__isnull=True)
        .exclude(country='')
        .values('country')
        .annotate(users=Count('id'))
        .order_by('-users')[:12]
    )
    users_by_country = [
        {
            'country': (row['country'] or '').strip().upper()[:2] or 'unknown',
            'users': row['users'],
        }
        for row in country_rows
    ]

    return {
        'range': f'{days}d',
        'generated_at': now.isoformat(),
        'reach': {
            'total_users': total_users,
            'active_logins': active_logins,
            'new_users': new_users,
            'onboarding_completed': onboarding_done,
            'onboarding_pct': round(onboarding_done * 100 / total_users, 1) if total_users else 0.0,
            'push_devices': push_total,
            'push_by_platform': push_by_platform,
            'subscriptions_total': sub_total,
            'subscriptions_active': sub_active,
            'subscriptions_trial': sub_trial,
        },
        'features': features,
        'login_series': login_series,
        'active_users_by_country': users_by_country,
    }
