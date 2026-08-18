"""Parse OCR text from receipts into structured fields with confidence scores."""
from __future__ import annotations

import re
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from typing import Any

CURRENCY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ('AOA', re.compile(r'\b(?:AOA|Kz|KZ|KWANZA)\b', re.I)),
    ('ZAR', re.compile(r'\b(?:ZAR|R\s*\d|\bRAND\b)', re.I)),
    ('USD', re.compile(r'\b(?:USD|\$\s*\d|\bDOLLAR)', re.I)),
    ('EUR', re.compile(r'\b(?:EUR|€\s*\d|\bEURO)', re.I)),
    ('GBP', re.compile(r'\b(?:GBP|£\s*\d|\bPOUND)', re.I)),
    ('BRL', re.compile(r'\b(?:BRL|R\$\s*\d|\bREAL)', re.I)),
    ('MZN', re.compile(r'\b(?:MZN|MT\s*\d)', re.I)),
    ('CAD', re.compile(r'\b(?:CAD|C\$)', re.I)),
]

TOTAL_KEYWORDS = re.compile(
    r'\b(?:grand\s*total|total\s*a\s*pagar|total\s*geral|amount\s*due|total\s*due|'
    r'total\s*to\s*pay|valor\s*total|importe\s*total|montante|importe|valor|'
    r'total)\b',
    re.I,
)

NON_TOTAL_KEYWORDS = re.compile(
    r'\b(?:sub-?total|sub\s*total|discount|desconto|change|troco|cashback|'
    r'qty|quantity|item)\b',
    re.I,
)

PAYABLE_TOTAL_KEYWORDS = re.compile(
    r'\b(?:grand\s*total|total\s*a\s*pagar|total\s*geral|amount\s*due|total\s*due|'
    r'total\s*to\s*pay|valor\s*total)\b',
    re.I,
)

DATE_PATTERNS = [
    re.compile(r'(\d{4})[-/](\d{2})[-/](\d{2})'),
    re.compile(r'(\d{2})[-/](\d{2})[-/](\d{4})'),
    re.compile(r'(\d{2})[-/](\d{2})[-/](\d{2})'),
]

TIME_PATTERN = re.compile(r'(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?', re.I)

RECEIPT_NUMBER = re.compile(
    r'(?:receipt|invoice|fatura|recibo|nota|doc|ref|n[ºo°\.])\s*[:#]?\s*([A-Z0-9\-/]+)',
    re.I,
)

TAX_PATTERN = re.compile(
    r'(?:vat|iva|tax|imposto)\s*[:#]?\s*([\d.,]+)',
    re.I,
)

AMOUNT_PATTERN = re.compile(r'([\d]{1,3}(?:[.,\s]\d{3})*[.,]\d{2}|\d+[.,]\d{2})')

CATEGORY_HINTS: dict[str, list[str]] = {
    'Food': ['supermarket', 'shoprite', 'pick n pay', 'grocery', 'food', 'restaurant', 'mercado', 'supermercado'],
    'Transport': ['fuel', 'petrol', 'gas', 'taxi', 'uber', 'transport', 'combustivel'],
    'Electricity': ['electric', 'edel', 'endesa', 'electricidade', 'energia'],
    'Rent': ['rent', 'aluguer', 'lease'],
    'Education': ['school', 'university', 'escola', 'universidade'],
    'Healthcare': ['pharmacy', 'clinic', 'hospital', 'farmacia', 'clinica'],
    'Shopping': ['shop', 'store', 'loja', 'retail'],
    'Entertainment': ['cinema', 'netflix', 'spotify', 'entertainment'],
    'Business': ['office', 'supplies', 'escritorio'],
}


def _parse_amount(raw: str) -> Decimal | None:
    text = raw.strip().replace(' ', '').replace('\u00a0', '')
    if not text:
        return None
    if re.fullmatch(r'\d{1,3}(,\d{3})+', text):
        text = text.replace(',', '')
    elif re.fullmatch(r'\d{1,3}(\.\d{3})+', text):
        text = text.replace('.', '')
    elif re.fullmatch(r'\d{1,3}(\.\d{3})+,\d{1,2}', text):
        text = text.replace('.', '').replace(',', '.')
    elif re.fullmatch(r'\d{1,3}(,\d{3})+\.\d{1,2}', text):
        text = text.replace(',', '')
    elif text.count(',') == 1 and text.count('.') == 0:
        left, right = text.split(',')
        text = text.replace(',', '') if len(right) == 3 else text.replace(',', '.')
    else:
        text = text.replace(',', '')
    try:
        return Decimal(text).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        return None


def _detect_currency(text: str, default: str = 'AOA') -> tuple[str, float]:
    scores: dict[str, int] = {}
    for code, pattern in CURRENCY_PATTERNS:
        matches = pattern.findall(text)
        if matches:
            scores[code] = len(matches)
    if not scores:
        return default.upper(), 0.3
    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    return best, min(0.5 + scores[best] * 0.15, 0.95)


def _extract_total(text: str) -> tuple[Decimal | None, float]:
    lines = text.splitlines()
    candidates: list[tuple[Decimal, float, int]] = []

    for i, line in enumerate(lines):
        line_lower = line.lower()
        if NON_TOTAL_KEYWORDS.search(line_lower) and not PAYABLE_TOTAL_KEYWORDS.search(line_lower):
            weight = 0.15
        elif PAYABLE_TOTAL_KEYWORDS.search(line_lower):
            weight = 0.98
        elif TOTAL_KEYWORDS.search(line_lower):
            weight = 0.9
        elif i >= len(lines) - 5:
            weight = 0.65
        else:
            weight = 0.45

        found = False
        for match in AMOUNT_PATTERN.finditer(line):
            amount = _parse_amount(match.group(1))
            if amount and amount > 0:
                candidates.append((amount, weight, i))
                found = True
        if not found and TOTAL_KEYWORDS.search(line_lower) and not NON_TOTAL_KEYWORDS.search(line_lower):
            int_match = re.search(r'(\d{1,3}(?:[.,\s]\d{3})+|\d{4,})', line)
            if int_match:
                amount = _parse_amount(int_match.group(1) + '.00')
                if amount and amount > 0:
                    candidates.append((amount, weight * 0.8, i))

    if not candidates:
        for match in AMOUNT_PATTERN.finditer(text):
            amount = _parse_amount(match.group(1))
            if amount and amount > 0:
                candidates.append((amount, 0.35, 0))

    if not candidates:
        return None, 0.0

    # Prefer payable-total weight, then later lines, then larger amount
    candidates.sort(key=lambda x: (x[1], x[2], x[0]), reverse=True)
    return candidates[0][0], candidates[0][1]


def _extract_date(text: str) -> tuple[date | None, float]:
    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        groups = match.groups()
        try:
            if len(groups[0]) == 4:
                return date(int(groups[0]), int(groups[1]), int(groups[2])), 0.75
            if len(groups[2]) == 4:
                return date(int(groups[2]), int(groups[1]), int(groups[0])), 0.75
            year = 2000 + int(groups[2])
            return date(year, int(groups[1]), int(groups[0])), 0.6
        except ValueError:
            continue
    return None, 0.0


def _extract_time(text: str) -> time | None:
    match = TIME_PATTERN.search(text)
    if not match:
        return None
    hour = int(match.group(1))
    minute = int(match.group(2))
    second = int(match.group(3) or 0)
    ampm = (match.group(4) or '').upper()
    if ampm == 'PM' and hour < 12:
        hour += 12
    elif ampm == 'AM' and hour == 12:
        hour = 0
    try:
        return time(hour, minute, second)
    except ValueError:
        return None


def _extract_merchant(text: str) -> tuple[str, float]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return '', 0.0
    # First non-numeric substantial line is often merchant name
    for line in lines[:5]:
        if len(line) >= 3 and not re.fullmatch(r'[\d\s.,\-/]+', line):
            return line[:200], 0.55
    return lines[0][:200], 0.35


def _extract_receipt_number(text: str) -> str:
    match = RECEIPT_NUMBER.search(text)
    return match.group(1).strip()[:100] if match else ''


def _extract_tax(text: str) -> Decimal | None:
    match = TAX_PATTERN.search(text)
    if match:
        return _parse_amount(match.group(1))
    return None


def _suggest_category(text: str, merchant: str) -> str:
    combined = f'{merchant} {text}'.lower()
    for category, hints in CATEGORY_HINTS.items():
        if any(h in combined for h in hints):
            return category
    return 'Other'


def _extract_items(text: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) < 5:
            continue
        amount_match = AMOUNT_PATTERN.search(line)
        if amount_match:
            amount = _parse_amount(amount_match.group(1))
            name = line[: amount_match.start()].strip(' -•\t')
            if name and amount:
                items.append({'name': name[:120], 'amount': str(amount)})
    return items[:20]


def parse_receipt_text(
    text: str,
    *,
    default_currency: str = 'AOA',
    locale: str = 'pt',
) -> dict[str, Any]:
    """
    Parse raw OCR text into structured receipt data.
    Returns dict with fields and overall confidence_score (0-1).
    """
    text = (text or '').strip()
    if not text:
        return {
            'merchant': '',
            'amount': None,
            'currency': default_currency.upper(),
            'receipt_date': None,
            'receipt_time': None,
            'tax_amount': None,
            'receipt_number': '',
            'items': [],
            'payment_method': '',
            'merchant_address': '',
            'suggested_category': 'Other',
            'confidence_score': Decimal('0'),
            'status': 'failed',
        }

    merchant, merchant_conf = _extract_merchant(text)
    amount, amount_conf = _extract_total(text)
    currency, currency_conf = _detect_currency(text, default_currency)
    receipt_date, date_conf = _extract_date(text)
    receipt_time = _extract_time(text)
    tax_amount = _extract_tax(text)
    receipt_number = _extract_receipt_number(text)
    items = _extract_items(text)
    suggested = _suggest_category(text, merchant)

    payment_method = ''
    lower = text.lower()
    if any(w in lower for w in ('visa', 'mastercard', 'cartão', 'card', 'debit')):
        payment_method = 'card'
    elif any(w in lower for w in ('transfer', 'transferência', 'multicaixa', 'mcx')):
        payment_method = 'transfer'
    elif any(w in lower for w in ('cash', 'dinheiro', 'numerário')):
        payment_method = 'cash'

    confidences = [c for c in (amount_conf, merchant_conf, currency_conf, date_conf) if c > 0]
    overall = Decimal(str(sum(confidences) / len(confidences) if confidences else 0)).quantize(Decimal('0.001'))

    LOW_CONFIDENCE_THRESHOLD = Decimal('0.6')
    if amount is None:
        status = 'failed'
        overall = Decimal('0')
    elif overall < LOW_CONFIDENCE_THRESHOLD:
        status = 'low_confidence'
    else:
        status = 'processed'

    return {
        'merchant': merchant,
        'amount': amount,
        'currency': currency,
        'receipt_date': receipt_date,
        'receipt_time': receipt_time,
        'tax_amount': tax_amount,
        'receipt_number': receipt_number,
        'items': items,
        'payment_method': payment_method,
        'merchant_address': '',
        'suggested_category': suggested,
        'confidence_score': overall,
        'status': status,
    }
