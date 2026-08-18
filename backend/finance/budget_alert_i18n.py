"""Localized budget alert messages (pt, en, fr, es)."""
from __future__ import annotations

from decimal import Decimal

MESSAGES: dict[str, dict[str, str]] = {
    'budget_warning_70': {
        'pt': 'Usou 70% do orçamento {name}. Restam {remaining} {currency}.',
        'en': 'You have used 70% of your {name} budget. {remaining} {currency} remaining.',
        'fr': 'Vous avez utilisé 70 % du budget {name}. Il reste {remaining} {currency}.',
        'es': 'Has usado el 70 % del presupuesto {name}. Quedan {remaining} {currency}.',
    },
    'budget_warning_80': {
        'pt': 'Usou 80% do orçamento {name}. Restam {remaining} {currency}.',
        'en': 'You have used 80% of your {name} budget. {remaining} {currency} remaining.',
        'fr': 'Vous avez utilisé 80 % du budget {name}. Il reste {remaining} {currency}.',
        'es': 'Has usado el 80 % del presupuesto {name}. Quedan {remaining} {currency}.',
    },
    'budget_warning_90': {
        'pt': 'Usou 90% do orçamento {name}. Restam {remaining} {currency}.',
        'en': 'You have used 90% of your {name} budget. {remaining} {currency} remaining.',
        'fr': 'Vous avez utilisé 90 % du budget {name}. Il reste {remaining} {currency}.',
        'es': 'Has usado el 90 % del presupuesto {name}. Quedan {remaining} {currency}.',
    },
    'budget_at_limit': {
        'pt': 'Atingiu 100% do orçamento {name}.',
        'en': 'You have reached 100% of your {name} budget.',
        'fr': 'Vous avez atteint 100 % du budget {name}.',
        'es': 'Has alcanzado el 100 % del presupuesto {name}.',
    },
    'budget_exceeded': {
        'pt': '⚠️ O orçamento {name} foi excedido em {over} {currency}.',
        'en': '⚠️ Your {name} budget has been exceeded by {over} {currency}.',
        'fr': '⚠️ Le budget {name} a été dépassé de {over} {currency}.',
        'es': '⚠️ El presupuesto {name} se ha superado en {over} {currency}.',
    },
    'monthly_warning_80': {
        'pt': 'Usou 80% do limite mensal de gastos. Restam {remaining} {currency}.',
        'en': 'You have used 80% of your monthly spending budget. {remaining} {currency} remaining.',
        'fr': 'Vous avez utilisé 80 % de votre budget mensuel. Il reste {remaining} {currency}.',
        'es': 'Has usado el 80 % de tu presupuesto mensual. Quedan {remaining} {currency}.',
    },
    'monthly_at_limit': {
        'pt': 'Atingiu o limite mensal de gastos.',
        'en': 'You have reached your monthly spending limit.',
        'fr': 'Vous avez atteint votre limite de dépenses mensuelles.',
        'es': 'Has alcanzado tu límite de gastos mensuales.',
    },
    'monthly_exceeded': {
        'pt': 'Excedeu o orçamento mensal em {over} {currency}.',
        'en': 'You have exceeded your monthly budget by {over} {currency}.',
        'fr': 'Vous avez dépassé votre budget mensuel de {over} {currency}.',
        'es': 'Has superado tu presupuesto mensual en {over} {currency}.',
    },
}


def user_locale(user) -> str:
    raw = getattr(user, 'preferred_locale', None) or 'pt'
    code = str(raw).lower()[:2]
    return code if code in ('pt', 'en', 'fr', 'es') else 'pt'


def t(user, key: str, **kwargs: str) -> str:
    locale = user_locale(user)
    template = MESSAGES.get(key, {}).get(locale) or MESSAGES.get(key, {}).get('en', key)
    return template.format(**kwargs)


def budget_alert_level(percent: Decimal, spent: Decimal, limit: Decimal) -> int:
    if limit <= 0:
        return 0
    if spent > limit:
        return 101
    if percent >= Decimal('100'):
        return 100
    if percent >= Decimal('90'):
        return 90
    if percent >= Decimal('80'):
        return 80
    if percent >= Decimal('70'):
        return 70
    return 0
