"""Deterministic Copilot facts: never invent balances, rates, or transactions."""
from __future__ import annotations

import re
import uuid
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_CEILING
from typing import Any

from django.utils import timezone

from finance.fx import convert_amount
from finance.services import _preferred, _sum_queryset_amounts, build_analytics, compute_financial_health

CURRENCY_ALIASES = {
    'R': 'ZAR',
    'ZAR': 'ZAR',
    'RAND': 'ZAR',
    'RANDS': 'ZAR',
    'KZ': 'AOA',
    'AOA': 'AOA',
    'KWANZA': 'AOA',
    'USD': 'USD',
    'DOLLAR': 'USD',
    'DOLLARS': 'USD',
    'US': 'USD',
    'EUR': 'EUR',
    'EURO': 'EUR',
    'EUROS': 'EUR',
    'GBP': 'GBP',
    'POUND': 'GBP',
    'POUNDS': 'GBP',
    'BRL': 'BRL',
    'REAL': 'BRL',
    'REAIS': 'BRL',
    'MZN': 'MZN',
    'CAD': 'CAD',
}

KNOWN_CODES = {'AOA', 'USD', 'EUR', 'GBP', 'BRL', 'ZAR', 'MZN', 'CAD'}

LEVEL_STYLE = {
    'beginner': 'Use simple language. Briefly explain any financial term you use.',
    'intermediate': 'Give practical analysis and concrete next steps.',
    'advanced': 'Go deeper: trends, percentages, projections and trade-offs. Stay concise.',
}


def _dec(value) -> Decimal:
    try:
        return Decimal(str(value or 0)).quantize(Decimal('0.01'))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal('0.00')


def _money(amount, currency: str) -> dict[str, Any]:
    return {'amount': str(_dec(amount)), 'currency': (currency or 'AOA').upper()}


def _norm_locale(raw: str | None) -> str:
    code = (raw or 'pt').lower()[:2]
    return code if code in ('pt', 'en', 'fr', 'es') else 'pt'


def _norm_level(raw: str | None) -> str:
    value = (raw or 'beginner').lower()
    return value if value in ('beginner', 'intermediate', 'advanced') else 'beginner'


def _parse_amount(raw: str) -> Decimal | None:
    text = raw.strip().replace(' ', '').replace('\u00a0', '')
    if not text:
        return None
    # 5,000 / 250,000
    if re.fullmatch(r'\d{1,3}(,\d{3})+', text):
        text = text.replace(',', '')
    # 5.000 / 250.000
    elif re.fullmatch(r'\d{1,3}(\.\d{3})+', text):
        text = text.replace('.', '')
    # 5.000,50
    elif re.fullmatch(r'\d{1,3}(\.\d{3})+,\d{1,2}', text):
        text = text.replace('.', '').replace(',', '.')
    # 5,000.50
    elif re.fullmatch(r'\d{1,3}(,\d{3})+\.\d{1,2}', text):
        text = text.replace(',', '')
    elif text.count(',') == 1 and text.count('.') == 0:
        _left, right = text.split(',')
        if len(right) == 3:
            text = text.replace(',', '')
        else:
            text = text.replace(',', '.')
    else:
        text = text.replace(',', '')
    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        return None


def _alias(token: str) -> str | None:
    cleaned = token.strip().upper().replace('.', '')
    if cleaned in ('$', 'USD$'):
        return 'USD'
    if cleaned in ('€',):
        return 'EUR'
    if cleaned in ('£',):
        return 'GBP'
    return CURRENCY_ALIASES.get(cleaned) or (cleaned if cleaned in KNOWN_CODES else None)


def parse_fx_request(message: str) -> dict[str, Any] | None:
    """Extract convert X FROM to TO from the user message. None if not an FX question."""
    text = message.strip()
    upper = text.upper()
    if not any(w in upper for w in ('CONVERT', 'CONVERTA', 'CÂMBIO', 'CAMBIO', 'EXCHANGE', 'HOW MUCH IS', 'QUANTO É', 'QUANTO E', 'COMBIEN', 'CUÁNTO', 'CUANTO')):
        if not re.search(r'\b(TO|PARA|EN|IN)\s+(USD|EUR|GBP|AOA|ZAR|BRL|DOLLARS?|EUROS?|RANDS?|KWANZA)\b', upper):
            return None

    amount = None
    from_ccy = None
    to_ccy = None

    prefixed = re.search(
        r'(?:R|R\$)\s*([\d][\d\s.,]*)',
        text,
        re.IGNORECASE,
    )
    kz = re.search(r'([\d][\d\s.,]*)\s*(?:KZ|AOA|KWANZA)', text, re.IGNORECASE)
    dollar = re.search(r'\$\s*([\d][\d\s.,]*)', text)
    generic = re.search(
        r'([\d][\d\s.,]+)\s*(ZAR|AOA|USD|EUR|GBP|BRL|MZN|CAD|KZ|R)\b',
        text,
        re.IGNORECASE,
    )
    if prefixed:
        amount = _parse_amount(prefixed.group(1))
        from_ccy = 'ZAR'
    elif kz:
        amount = _parse_amount(kz.group(1))
        from_ccy = 'AOA'
    elif dollar:
        amount = _parse_amount(dollar.group(1))
        from_ccy = 'USD'
    elif generic:
        amount = _parse_amount(generic.group(1))
        from_ccy = _alias(generic.group(2))

    to_match = re.search(
        r'\b(?:to|in|para|en|em|a)\s+(USD|EUR|GBP|AOA|ZAR|BRL|MZN|CAD|DOLLARS?|EUROS?|RANDS?|KWANZA|KWANZAS|EUROS|DÓLARES|DOLARES)\b',
        text,
        re.IGNORECASE,
    )
    if to_match:
        to_ccy = _alias(to_match.group(1))
    elif 'DOLLAR' in upper or 'DÓLAR' in upper or 'DOLAR' in upper:
        to_ccy = 'USD'
    elif 'EURO' in upper:
        to_ccy = 'EUR'
    elif 'RAND' in upper:
        to_ccy = 'ZAR'

    if amount is None or not from_ccy or not to_ccy:
        return None
    return {'amount': amount, 'from': from_ccy, 'to': to_ccy}


def parse_extra_payment(message: str, default_currency: str) -> dict[str, Any] | None:
    match = re.search(
        r'(?:extra|mais|plus|más)\s+(?:R\$?|\$|€|£)?\s*([\d][\d\s.,]*)\s*([A-Z]{3}|KZ|R)?',
        message,
        re.IGNORECASE,
    )
    if not match:
        return None
    amount = _parse_amount(match.group(1))
    if amount is None:
        return None
    ccy = _alias(match.group(2) or '') or default_currency
    return {'amount': amount, 'currency': ccy}


def parse_proposed_action(message: str, currency: str, today: date) -> dict[str, Any] | None:
    text = message.strip()
    lower = text.lower()
    amount_match = re.search(r'([\d][\d\s.,]+)\s*([A-Z]{3}|KZ|R)?', text, re.IGNORECASE)
    amount = _parse_amount(amount_match.group(1)) if amount_match else None
    ccy = _alias(amount_match.group(2) or '') if amount_match else None
    ccy = ccy or currency
    if amount is None:
        return None

    if re.search(r'\b(create|criar|créer|crea).{0,40}\b(budget|orçamento|orcamento|budget)\b', lower):
        return {
            'id': str(uuid.uuid4()),
            'type': 'create_budget',
            'status': 'pending',
            'payload': {
                'amount': str(amount),
                'currency': ccy,
                'month': today.month,
                'year': today.year,
                'description': 'Created via AI Copilot',
            },
        }
    if re.search(r'\b(create|criar|créer|crea).{0,40}\b(goal|meta|objectif|objetivo|savings|poupança|poupanca)\b', lower):
        target = today + timedelta(days=180)
        return {
            'id': str(uuid.uuid4()),
            'type': 'create_goal',
            'status': 'pending',
            'payload': {
                'title': 'Savings goal',
                'target_amount': str(amount),
                'currency': ccy,
                'target_date': target.isoformat(),
            },
        }
    if re.search(r'\b(add|adicionar|ajouter|añadir|anadir).{0,40}\b(expense|despesa|dépense|depense|gasto)\b', lower):
        return {
            'id': str(uuid.uuid4()),
            'type': 'create_expense',
            'status': 'pending',
            'payload': {
                'amount': str(amount),
                'currency': ccy,
                'description': 'Logged via AI Copilot',
                'date': today.isoformat(),
            },
        }
    return None


def detect_intent(message: str) -> str:
    t = message.lower()
    if parse_fx_request(message):
        return 'fx_convert'
    if any(w in t for w in ('family', 'família', 'familia', 'famille')):
        return 'family'
    if any(w in t for w in ('business', 'negócio', 'negocio', 'entreprise', 'empresa', 'cash flow', 'revenue', 'lucro', 'profit')):
        return 'business'
    if any(w in t for w in ('convert', 'câmbio', 'cambio', 'exchange', 'kwanza', 'rand')):
        return 'fx_convert'
    if any(w in t for w in ('debt', 'dívida', 'divida', 'dette', 'deuda')):
        return 'debt'
    if any(w in t for w in ('budget', 'orçamento', 'orcamento', 'presupuesto')):
        return 'budget'
    if any(w in t for w in ('goal', 'meta', 'objectif', 'objetivo', 'save', 'poupar', 'épargner', 'ahorrar')):
        return 'savings'
    if any(w in t for w in ('salary', 'salário', 'salario', 'income', 'receita', 'revenu', 'ingreso')):
        return 'income'
    if any(w in t for w in ('spend', 'spent', 'expense', 'despesa', 'gasto', 'dépense')):
        return 'expenses'
    if any(w in t for w in ('afford', 'posso gastar', 'puedo gastar', 'puis-je')):
        return 'afford'
    if any(w in t for w in ('analy', 'análise', 'analisis', 'analyse')):
        return 'analyze'
    return 'general'


def _category_totals(user, month: int, year: int, preferred: str) -> list[dict[str, Any]]:
    from finance.models import PersonalExpense

    totals: dict[str, Decimal] = {}
    for exp in PersonalExpense.objects.filter(user=user, date__month=month, date__year=year).select_related('category'):
        name = exp.category.name if exp.category else 'Other'
        fx = convert_amount(exp.amount, exp.currency or preferred, preferred)
        amt = fx['converted_amount'] if fx else _dec(exp.amount)
        totals[name] = totals.get(name, Decimal('0')) + amt
    ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)
    return [{'name': name, **_money(total, preferred)} for name, total in ranked[:8]]


def _family_context(user, preferred: str, today: date) -> list[dict[str, Any]]:
    try:
        from finance_space.models import FinanceSpace
        from finance_space.permissions import active_membership, can_view_entry
    except Exception:
        return []

    spaces = FinanceSpace.objects.filter(members__user=user, members__status='active').distinct()
    out = []
    for space in spaces:
        membership = active_membership(user, space)
        if not membership:
            continue
        entries = [
            e
            for e in space.entries.filter(date__month=today.month, date__year=today.year)
            if can_view_entry(user, e)
        ]
        income = sum((_dec(e.converted_amount or e.amount) for e in entries if e.kind == 'income'), Decimal('0'))
        expenses = sum((_dec(e.converted_amount or e.amount) for e in entries if e.kind == 'expense'), Decimal('0'))
        cats: dict[str, Decimal] = {}
        for e in entries:
            if e.kind != 'expense':
                continue
            name = e.category or 'Other'
            cats[name] = cats.get(name, Decimal('0')) + _dec(e.converted_amount or e.amount)
        top = sorted(cats.items(), key=lambda kv: kv[1], reverse=True)[:5]
        budgets = list(space.shared_budgets.filter(month=today.month, year=today.year))
        budget_amount = sum((_dec(b.amount) for b in budgets), Decimal('0'))
        budget_spent = sum((_dec(b.spent) for b in budgets), Decimal('0'))
        goals = [
            {
                'title': g.title,
                'target': str(g.target_amount),
                'current': str(g.current_amount),
                'remaining': str(_dec(g.target_amount) - _dec(g.current_amount)),
                'currency': g.currency or space.currency,
            }
            for g in space.shared_goals.all()[:5]
        ]
        out.append({
            'id': space.id,
            'name': space.name,
            'currency': space.currency or preferred,
            'role': membership.role,
            'income': str(income),
            'expenses': str(expenses),
            'top_categories': [{'name': n, 'amount': str(a)} for n, a in top],
            'budget_amount': str(budget_amount),
            'budget_spent': str(budget_spent),
            'goals': goals,
        })
    return out


def _business_context(user, month: int, year: int, preferred: str) -> dict[str, Any]:
    from finance.models import BusinessExpense, Sale

    revenue = _sum_queryset_amounts(
        Sale.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    expenses = _sum_queryset_amounts(
        BusinessExpense.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    prev_m, prev_y = (month - 1, year) if month > 1 else (12, year - 1)
    prev_rev = _sum_queryset_amounts(
        Sale.objects.filter(user=user, date__month=prev_m, date__year=prev_y),
        target=preferred,
    )
    prev_exp = _sum_queryset_amounts(
        BusinessExpense.objects.filter(user=user, date__month=prev_m, date__year=prev_y),
        target=preferred,
    )
    return {
        'revenue': str(revenue),
        'expenses': str(expenses),
        'profit': str(revenue - expenses),
        'last_month_revenue': str(prev_rev),
        'last_month_expenses': str(prev_exp),
        'currency': preferred,
        'has_data': bool(revenue or expenses),
    }


def build_user_snapshot(user, locale: str | None = None) -> dict[str, Any]:
    from finance.models import Budget, Debt, Goal, PersonalExpense, PersonalIncome

    today = timezone.now().date()
    month, year = today.month, today.year
    prev_m, prev_y = (month - 1, year) if month > 1 else (12, year - 1)
    preferred = _preferred(user)
    locale = _norm_locale(locale or getattr(user, 'preferred_locale', None))
    level = _norm_level(getattr(user, 'finance_level', None))

    income = _sum_queryset_amounts(
        PersonalIncome.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    salary = _sum_queryset_amounts(
        PersonalIncome.objects.filter(
            user=user, date__month=month, date__year=year, source_type='salary'
        ),
        target=preferred,
    )
    expenses = _sum_queryset_amounts(
        PersonalExpense.objects.filter(user=user, date__month=month, date__year=year),
        target=preferred,
    )
    last_expenses = _sum_queryset_amounts(
        PersonalExpense.objects.filter(user=user, date__month=prev_m, date__year=prev_y),
        target=preferred,
    )
    budgets = list(Budget.objects.filter(user=user, month=month, year=year, period_type='monthly'))
    budget_amount = Decimal('0')
    budget_spent = Decimal('0')
    over = []
    for b in budgets:
        cur = (b.currency or preferred).upper()
        amt = convert_amount(b.amount, cur, preferred)
        spent_fx = convert_amount(b.spent, cur, preferred)
        b_amt = amt['converted_amount'] if amt else _dec(b.amount)
        b_spent = spent_fx['converted_amount'] if spent_fx else _dec(b.spent)
        budget_amount += b_amt
        budget_spent += b_spent
        if b.amount > 0 and b.spent > b.amount:
            over.append({
                'name': b.category.name if b.category else (b.description or 'Budget'),
                'amount': str(b.amount),
                'spent': str(b.spent),
                'currency': cur,
            })

    debts = []
    debt_total = Decimal('0')
    for d in Debt.objects.filter(user=user, status__in=['active', 'overdue']):
        rem_fx = convert_amount(d.remaining_amount, d.currency or preferred, preferred)
        rem = rem_fx['converted_amount'] if rem_fx else _dec(d.remaining_amount)
        debt_total += rem
        debts.append({
            'id': d.id,
            'creditor': d.creditor,
            'remaining_original': str(_dec(d.remaining_amount)),
            'remaining_preferred': str(rem),
            'currency': d.currency or preferred,
            'interest_rate': str(d.interest_rate or 0),
            'status': d.status,
        })

    goals = []
    for g in Goal.objects.filter(user=user, status='active'):
        remaining = _dec(g.target_amount) - _dec(g.current_amount)
        days = max((g.target_date - today).days, 1) if g.target_date else 180
        months = max(Decimal(days) / Decimal('30'), Decimal('1'))
        monthly = (remaining / months).quantize(Decimal('0.01')) if remaining > 0 else Decimal('0')
        goals.append({
            'title': g.title,
            'target': str(g.target_amount),
            'current': str(g.current_amount),
            'remaining': str(remaining),
            'currency': g.currency or preferred,
            'target_date': g.target_date.isoformat() if g.target_date else None,
            'suggested_monthly': str(monthly),
        })

    health = compute_financial_health(user, month, year)
    analytics = build_analytics(user)
    cats = _category_totals(user, month, year, preferred)
    last_cats = _category_totals(user, prev_m, prev_y, preferred)
    pct_change = None
    if last_expenses > 0:
        pct_change = float(((expenses - last_expenses) / last_expenses) * 100)

    missing: list[str] = []
    if income <= 0:
        missing.append('income')
    if expenses <= 0:
        missing.append('expenses')
    if not budgets:
        missing.append('budget')
    if not debts:
        missing.append('debt')
    if not goals:
        missing.append('goals')

    safe_spend = max(income - expenses, Decimal('0'))
    suggested_save = (income * Decimal('0.20')).quantize(Decimal('0.01')) if income > 0 else None

    return {
        'user_name': user.get_full_name() or user.first_name or user.email.split('@')[0],
        'locale': locale,
        'finance_level': level,
        'onboarding_goals': getattr(user, 'onboarding_goals', None) or [],
        'currency': preferred,
        'month': month,
        'year': year,
        'income': str(income),
        'salary': str(salary),
        'expenses': str(expenses),
        'last_month_expenses': str(last_expenses),
        'expense_change_pct': pct_change,
        'balance': str(income - expenses),
        'budget_amount': str(budget_amount),
        'budget_spent': str(budget_spent),
        'budget_remaining': str(budget_amount - budget_spent) if budget_amount else None,
        'over_budget': over,
        'categories': cats,
        'last_month_categories': last_cats,
        'debts': debts,
        'debt_total': str(debt_total),
        'goals': goals,
        'safe_to_spend': str(safe_spend),
        'suggested_save_20pct': str(suggested_save) if suggested_save is not None else None,
        'health': {'score': health.get('score'), 'grade': health.get('grade'), 'tips': health.get('tips') or []},
        'family': _family_context(user, preferred, today),
        'business': _business_context(user, month, year, preferred),
        'missing': missing,
        'days_in_month': monthrange(year, month)[1],
        'analytics': {
            'debt_payoff': analytics.get('debt_payoff') or [],
            'savings_projection': analytics.get('savings_projection') or [],
        },
    }


def run_calculations(user, message: str, locale: str | None = None) -> dict[str, Any]:
    """Backend calculations + optional FX quote + proposed action. LLM must not recompute these."""
    today = timezone.now().date()
    snapshot = build_user_snapshot(user, locale)
    preferred = snapshot['currency']
    intent = detect_intent(message)
    fx_req = parse_fx_request(message)
    fx_quote = None
    if fx_req:
        quote = convert_amount(fx_req['amount'], fx_req['from'], fx_req['to'])
        if quote:
            ts = quote.get('provider_updated_at') or quote.get('updated_at')
            fx_quote = {
                'original_amount': str(_dec(quote['amount'])),
                'original_currency': quote['currency'],
                'converted_amount': str(_dec(quote['converted_amount'])),
                'target_currency': quote['display_currency'],
                'exchange_rate': str(quote['exchange_rate']),
                'source': quote.get('source') or '',
                'provider_updated_at': ts.isoformat() if hasattr(ts, 'isoformat') else (str(ts) if ts else None),
                'stale': bool(quote.get('stale')),
                'freshness': quote.get('freshness') or ('stale' if quote.get('stale') else 'live'),
            }
        else:
            fx_quote = {
                'error': 'rate_unavailable',
                'original_amount': str(fx_req['amount']),
                'original_currency': fx_req['from'],
                'target_currency': fx_req['to'],
            }

    extra = parse_extra_payment(message, preferred)
    extra_projection = None
    if extra and snapshot['debts']:
        rem = _dec(snapshot['debt_total'])
        extra_pref = convert_amount(extra['amount'], extra['currency'], preferred)
        monthly = extra_pref['converted_amount'] if extra_pref else extra['amount']
        months = int((rem / monthly).to_integral_value(rounding=ROUND_CEILING)) if monthly > 0 else None
        extra_projection = {
            'extra_monthly': str(monthly),
            'currency': preferred,
            'remaining': str(rem),
            'months_if_only_this_extra': months,
            'note': 'Zenda does not store a contractual instalment. This projection uses only the extra amount you named and ignores unrecorded interest unless an interest_rate is saved on the debt.',
        }

    action = parse_proposed_action(message, preferred, today)
    if action:
        action['summary'] = _action_summary(action, snapshot['locale'])

    return {
        'intent': intent,
        'snapshot': snapshot,
        'fx': fx_quote,
        'extra_debt_projection': extra_projection,
        'proposed_action': action,
    }


def _action_summary(action: dict[str, Any], locale: str) -> str:
    payload = action.get('payload') or {}
    kind = action.get('type')
    amount = payload.get('amount') or payload.get('target_amount')
    ccy = payload.get('currency')
    templates = {
        'en': {
            'create_budget': f'Create a {amount} {ccy} monthly budget. Nothing is saved until you confirm.',
            'create_goal': f'Create a savings goal of {amount} {ccy}. Nothing is saved until you confirm.',
            'create_expense': f'Add an expense of {amount} {ccy}. Nothing is saved until you confirm.',
        },
        'pt': {
            'create_budget': f'Criar um orçamento mensal de {amount} {ccy}. Nada é gravado até confirmar.',
            'create_goal': f'Criar uma meta de poupança de {amount} {ccy}. Nada é gravado até confirmar.',
            'create_expense': f'Adicionar uma despesa de {amount} {ccy}. Nada é gravado até confirmar.',
        },
        'fr': {
            'create_budget': f'Créer un budget mensuel de {amount} {ccy}. Rien n’est enregistré avant confirmation.',
            'create_goal': f'Créer un objectif d’épargne de {amount} {ccy}. Rien n’est enregistré avant confirmation.',
            'create_expense': f'Ajouter une dépense de {amount} {ccy}. Rien n’est enregistré avant confirmation.',
        },
        'es': {
            'create_budget': f'Crear un presupuesto mensual de {amount} {ccy}. Nada se guarda hasta que confirme.',
            'create_goal': f'Crear una meta de ahorro de {amount} {ccy}. Nada se guarda hasta que confirme.',
            'create_expense': f'Añadir un gasto de {amount} {ccy}. Nada se guarda hasta que confirme.',
        },
    }
    pack = templates.get(locale) or templates['en']
    return pack.get(kind, pack['create_budget'])


def template_reply(bundle: dict[str, Any]) -> str:
    """Localized, number-accurate reply used when the LLM is unavailable."""
    snap = bundle['snapshot']
    locale = snap['locale']
    ccy = snap['currency']
    intent = bundle['intent']
    missing = snap.get('missing') or []
    fx = bundle.get('fx')

    def t(en: str, pt: str, fr: str, es: str) -> str:
        return {'en': en, 'pt': pt, 'fr': fr, 'es': es}[locale]

    if fx:
        if fx.get('error') == 'rate_unavailable':
            return t(
                f"I don't have a market rate for {fx['original_currency']} → {fx['target_currency']} right now. Open Market in Zenda to retry — I will not invent a rate.",
                f"Não tenho uma taxa de mercado para {fx['original_currency']} → {fx['target_currency']} neste momento. Abra Mercado no Zenda para tentar de novo — não invento taxas.",
                f"Je n’ai pas de taux pour {fx['original_currency']} → {fx['target_currency']}. Ouvrez Marché dans Zenda — je n’invente pas de taux.",
                f"No tengo un tipo de mercado para {fx['original_currency']} → {fx['target_currency']}. Abra Mercado en Zenda — no invento tipos.",
            )
        live = t(
            'latest available (may be from the last market session)' if fx.get('stale') else 'live / current cache',
            'última disponível (pode ser da última sessão de mercado)' if fx.get('stale') else 'cache actual / ao vivo',
            'dernier disponible (dernière séance de marché)' if fx.get('stale') else 'cache actuel',
            'último disponible (puede ser de la última sesión)' if fx.get('stale') else 'caché actual',
        )
        return t(
            f"{fx['original_amount']} {fx['original_currency']} = {fx['converted_amount']} {fx['target_currency']}. "
            f"Rate: 1 {fx['original_currency']} = {fx['exchange_rate']} {fx['target_currency']}. "
            f"Source: {fx['source']}. Timestamp: {fx['provider_updated_at']}. Status: {live}.",
            f"{fx['original_amount']} {fx['original_currency']} = {fx['converted_amount']} {fx['target_currency']}. "
            f"Taxa: 1 {fx['original_currency']} = {fx['exchange_rate']} {fx['target_currency']}. "
            f"Fonte: {fx['source']}. Hora: {fx['provider_updated_at']}. Estado: {live}.",
            f"{fx['original_amount']} {fx['original_currency']} = {fx['converted_amount']} {fx['target_currency']}. "
            f"Taux : 1 {fx['original_currency']} = {fx['exchange_rate']} {fx['target_currency']}. "
            f"Source : {fx['source']}. Horodatage : {fx['provider_updated_at']}. Statut : {live}.",
            f"{fx['original_amount']} {fx['original_currency']} = {fx['converted_amount']} {fx['target_currency']}. "
            f"Tipo: 1 {fx['original_currency']} = {fx['exchange_rate']} {fx['target_currency']}. "
            f"Fuente: {fx['source']}. Fecha: {fx['provider_updated_at']}. Estado: {live}.",
        )

    if intent == 'income' and 'income' in missing:
        return t(
            "I don't have enough information about your monthly income to calculate that accurately. Please add your salary first in Personal finance.",
            "Não tenho informação suficiente sobre o seu rendimento mensal. Adicione o salário em Finanças pessoais.",
            "Je n’ai pas assez d’informations sur vos revenus. Ajoutez d’abord votre salaire dans Finances personnelles.",
            "No tengo suficiente información sobre sus ingresos. Añada primero el salario en Finanzas personales.",
        )

    if intent == 'family':
        families = snap.get('family') or []
        if not families:
            return t(
                "You are not an active member of a family space, or I cannot see shared data for your role.",
                "Não é membro activo de um espaço familiar, ou o seu papel não permite ver esses dados.",
                "Vous n’êtes pas membre actif d’un espace famille, ou votre rôle ne permet pas de voir ces données.",
                "No es miembro activo de un espacio familiar, o su rol no permite ver esos datos.",
            )
        f0 = families[0]
        top = f0['top_categories'][0]['name'] if f0.get('top_categories') else t('none yet', 'ainda nenhuma', 'aucune', 'ninguna')
        return t(
            f"Family «{f0['name']}» this month: spent {f0['expenses']} {f0['currency']}, income {f0['income']} {f0['currency']}. Top category: {top}. Budget used {f0['budget_spent']} of {f0['budget_amount']}. Private entries you are not allowed to see are excluded.",
            f"Família «{f0['name']}» este mês: despesas {f0['expenses']} {f0['currency']}, receitas {f0['income']} {f0['currency']}. Categoria principal: {top}. Orçamento {f0['budget_spent']} de {f0['budget_amount']}. Entradas privadas sem permissão estão excluídas.",
            f"Famille «{f0['name']}» ce mois : dépenses {f0['expenses']} {f0['currency']}, revenus {f0['income']} {f0['currency']}. Catégorie principale : {top}.",
            f"Familia «{f0['name']}» este mes: gastos {f0['expenses']} {f0['currency']}, ingresos {f0['income']} {f0['currency']}. Categoría principal: {top}.",
        )

    if intent == 'business':
        biz = snap.get('business') or {}
        if not biz.get('has_data'):
            return t(
                "I don't have business sales or expenses recorded this month. Add them in Business finance.",
                "Não tenho vendas ou despesas de negócio este mês. Adicione-as em Finanças do negócio.",
                "Je n’ai pas de ventes ou dépenses professionnelles ce mois-ci.",
                "No tengo ventas o gastos de negocio este mes.",
            )
        return t(
            f"Business this month: revenue {biz['revenue']} {ccy}, expenses {biz['expenses']} {ccy}, profit {biz['profit']} {ccy}. Last month revenue {biz['last_month_revenue']} {ccy}.",
            f"Negócio este mês: receitas {biz['revenue']} {ccy}, despesas {biz['expenses']} {ccy}, lucro {biz['profit']} {ccy}. Mês passado {biz['last_month_revenue']} {ccy}.",
            f"Entreprise ce mois : CA {biz['revenue']} {ccy}, dépenses {biz['expenses']} {ccy}, bénéfice {biz['profit']} {ccy}.",
            f"Negocio este mes: ingresos {biz['revenue']} {ccy}, gastos {biz['expenses']} {ccy}, beneficio {biz['profit']} {ccy}.",
        )

    top = snap['categories'][0] if snap.get('categories') else None
    lines = [
        t(
            f"This month you spent {snap['expenses']} {ccy} against income {snap['income']} {ccy} (balance {snap['balance']} {ccy}).",
            f"Este mês gastou {snap['expenses']} {ccy} face a receitas de {snap['income']} {ccy} (saldo {snap['balance']} {ccy}).",
            f"Ce mois vous avez dépensé {snap['expenses']} {ccy} pour {snap['income']} {ccy} de revenus (solde {snap['balance']} {ccy}).",
            f"Este mes gastó {snap['expenses']} {ccy} frente a ingresos de {snap['income']} {ccy} (saldo {snap['balance']} {ccy}).",
        )
    ]
    if snap.get('expense_change_pct') is not None:
        lines.append(t(
            f"Spending vs last month: {snap['expense_change_pct']:.1f}%.",
            f"Gastos vs mês passado: {snap['expense_change_pct']:.1f}%.",
            f"Dépenses vs mois dernier : {snap['expense_change_pct']:.1f} %.",
            f"Gastos vs mes pasado: {snap['expense_change_pct']:.1f}%.",
        ))
    if top:
        lines.append(t(
            f"Largest category: {top['name']} ({top['amount']} {ccy}).",
            f"Maior categoria: {top['name']} ({top['amount']} {ccy}).",
            f"Plus grosse catégorie : {top['name']} ({top['amount']} {ccy}).",
            f"Mayor categoría: {top['name']} ({top['amount']} {ccy}).",
        ))
    if snap.get('budget_amount') and _dec(snap['budget_amount']) > 0:
        lines.append(t(
            f"Budgets: {snap['budget_spent']} of {snap['budget_amount']} {ccy} used. Remaining {snap['budget_remaining']} {ccy}.",
            f"Orçamentos: {snap['budget_spent']} de {snap['budget_amount']} {ccy}. Resta {snap['budget_remaining']} {ccy}.",
            f"Budgets : {snap['budget_spent']} sur {snap['budget_amount']} {ccy}. Reste {snap['budget_remaining']} {ccy}.",
            f"Presupuestos: {snap['budget_spent']} de {snap['budget_amount']} {ccy}. Queda {snap['budget_remaining']} {ccy}.",
        ))
    if snap.get('over_budget'):
        names = ', '.join(b['name'] for b in snap['over_budget'])
        lines.append(t(f"Over budget: {names}.", f"Acima do orçamento: {names}.", f"Dépassement : {names}.", f"Por encima del presupuesto: {names}."))
    if _dec(snap['debt_total']) > 0:
        first = snap['debts'][0]
        lines.append(t(
            f"Active debt: {snap['debt_total']} {ccy}. Highest remaining: {first['creditor']} ({first['remaining_original']} {first['currency']}).",
            f"Dívida activa: {snap['debt_total']} {ccy}. Maior saldo: {first['creditor']} ({first['remaining_original']} {first['currency']}).",
            f"Dettes actives : {snap['debt_total']} {ccy}. Plus élevé : {first['creditor']}.",
            f"Deuda activa: {snap['debt_total']} {ccy}. Mayor saldo: {first['creditor']}.",
        ))
    extra = bundle.get('extra_debt_projection')
    if extra and extra.get('months_if_only_this_extra'):
        lines.append(t(
            f"If you paid an extra {extra['extra_monthly']} {ccy} per month toward {extra['remaining']} {ccy} remaining, it would take about {extra['months_if_only_this_extra']} months (see note: {extra['note']}).",
            f"Se pagar mais {extra['extra_monthly']} {ccy}/mês sobre {extra['remaining']} {ccy} em dívida, tardaria cerca de {extra['months_if_only_this_extra']} meses. {extra['note']}",
            f"Avec {extra['extra_monthly']} {ccy} de plus par mois, il faudrait environ {extra['months_if_only_this_extra']} mois.",
            f"Si paga {extra['extra_monthly']} {ccy} extra al mes, tardaría unos {extra['months_if_only_this_extra']} meses.",
        ))
    if snap.get('suggested_save_20pct'):
        lines.append(t(
            f"A 20% savings guideline on this month's income is {snap['suggested_save_20pct']} {ccy}. Safe leftover after recorded expenses: {snap['safe_to_spend']} {ccy}.",
            f"Uma referência de 20% de poupança sobre o rendimento deste mês é {snap['suggested_save_20pct']} {ccy}. Folga após despesas: {snap['safe_to_spend']} {ccy}.",
            f"Repère 20 % d’épargne : {snap['suggested_save_20pct']} {ccy}. Reste après dépenses : {snap['safe_to_spend']} {ccy}.",
            f"Referencia del 20% de ahorro: {snap['suggested_save_20pct']} {ccy}. Sobrante: {snap['safe_to_spend']} {ccy}.",
        ))
    if snap.get('goals'):
        g = snap['goals'][0]
        lines.append(t(
            f"Goal «{g['title']}»: remaining {g['remaining']} {g['currency']}. Suggested monthly {g['suggested_monthly']} {g['currency']} to hit the target date.",
            f"Meta «{g['title']}»: faltam {g['remaining']} {g['currency']}. Poupe cerca de {g['suggested_monthly']} {g['currency']}/mês.",
            f"Objectif «{g['title']}» : reste {g['remaining']} {g['currency']}. Mensuel suggéré {g['suggested_monthly']}.",
            f"Meta «{g['title']}»: restan {g['remaining']} {g['currency']}. Mensual sugerido {g['suggested_monthly']}.",
        ))
    if bundle.get('proposed_action'):
        lines.append(bundle['proposed_action']['summary'])
    return '\n'.join(lines)


def system_prompt(bundle: dict[str, Any]) -> str:
    snap = bundle['snapshot']
    locale = snap['locale']
    language = {'pt': 'Portuguese', 'en': 'English', 'fr': 'French', 'es': 'Spanish'}[locale]
    level = snap['finance_level']
    facts_json = {
        'intent': bundle['intent'],
        'currency': snap['currency'],
        'income': snap['income'],
        'salary': snap['salary'],
        'expenses': snap['expenses'],
        'last_month_expenses': snap['last_month_expenses'],
        'expense_change_pct': snap['expense_change_pct'],
        'balance': snap['balance'],
        'budget_amount': snap['budget_amount'],
        'budget_spent': snap['budget_spent'],
        'budget_remaining': snap['budget_remaining'],
        'over_budget': snap['over_budget'],
        'categories': snap['categories'][:5],
        'debts': snap['debts'],
        'debt_total': snap['debt_total'],
        'goals': snap['goals'],
        'safe_to_spend': snap['safe_to_spend'],
        'suggested_save_20pct': snap['suggested_save_20pct'],
        'health': snap['health'],
        'family': snap['family'],
        'business': snap['business'],
        'missing': snap['missing'],
        'fx': bundle.get('fx'),
        'extra_debt_projection': bundle.get('extra_debt_projection'),
        'proposed_action': bundle.get('proposed_action'),
    }
    import json
    return f"""You are Zenda AI Financial Copilot. Educational assistant only — not regulated financial advice.

LANGUAGE: Reply entirely in {language} (locale={locale}). Do not switch languages.

TONE ({level}): {LEVEL_STYLE[level]}

ACCURACY — NON-NEGOTIABLE:
- Use ONLY the FACTS JSON below. Those numbers were calculated by Zenda's backend.
- Never invent balances, rates, transactions, debts, income, or statistics.
- If a field is missing or in "missing", say you need the user to add that data in the app.
- Never invent exchange rates. If fx is null, do not convert. If fx.error is rate_unavailable, say so.
- Family facts already exclude private entries the user cannot see. Do not speculate about hidden family data.
- Original amounts keep their original currency; converted totals are in {snap['currency']}.

FACTS JSON:
{json.dumps(facts_json, default=str, ensure_ascii=False)}

When explaining FX, always list: original amount+currency, converted amount+currency, rate, source, timestamp, and whether the rate is live or latest available.

If proposed_action is present, ask the user to confirm. Never claim you already saved data.

Keep the answer focused on the user's question. Use short sections or bullets when helpful."""
