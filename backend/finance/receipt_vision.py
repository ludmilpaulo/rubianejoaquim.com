"""Optional OpenAI vision fallback when on-device OCR text is missing or low-confidence."""
from __future__ import annotations

import json
import logging
from decimal import Decimal, InvalidOperation
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

IMAGE_SUFFIXES = ('.jpg', '.jpeg', '.png', '.webp', '.gif')


def extract_receipt_with_vision(receipt) -> dict[str, Any] | None:
    """
    Return structured receipt fields from the uploaded image.
    Never logs image bytes. Returns None when OpenAI is unavailable or the file is not an image.
    """
    api_key = getattr(settings, 'OPENAI_API_KEY', None)
    if not api_key or not receipt.file:
        return None
    name = (getattr(receipt.file, 'name', '') or '').lower()
    if not name.endswith(IMAGE_SUFFIXES):
        return None

    try:
        from openai import OpenAI
    except ImportError:
        logger.info('receipt_vision skipped: openai package missing')
        return None

    try:
        receipt.file.open('rb')
        raw = receipt.file.read()
    except Exception:
        logger.info('receipt_vision skipped: could not read file')
        return None
    finally:
        try:
            receipt.file.close()
        except Exception:
            pass

    if not raw or len(raw) > 8 * 1024 * 1024:
        return None

    import base64

    mime = 'image/jpeg'
    if name.endswith('.png'):
        mime = 'image/png'
    elif name.endswith('.webp'):
        mime = 'image/webp'
    elif name.endswith('.gif'):
        mime = 'image/gif'
    b64 = base64.b64encode(raw).decode('ascii')

    prompt = (
        'Extract the payable TOTAL (not subtotal, tax, or line items) from this receipt. '
        'Return JSON only with keys: merchant, amount (string decimal), currency (ISO 4217, '
        'Kz/AOA=AOA, R/ZAR=ZAR), date (YYYY-MM-DD or empty), confidence (0-1), raw_text. '
        'If unsure about the total, still fill amount and set confidence below 0.6.'
    )
    try:
        client = OpenAI(api_key=api_key, timeout=30.0)
        response = client.chat.completions.create(
            model=getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini'),
            messages=[
                {
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {
                            'type': 'image_url',
                            'image_url': {'url': f'data:{mime};base64,{b64}'},
                        },
                    ],
                }
            ],
            max_tokens=400,
            temperature=0,
        )
        content = (response.choices[0].message.content or '').strip()
    except Exception:
        logger.info('receipt_vision openai call failed')
        return None

    if not content:
        return None
    if content.startswith('```'):
        content = content.strip('`')
        if content.startswith('json'):
            content = content[4:]
        content = content.strip()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        logger.info('receipt_vision returned non-json')
        return None
    if not isinstance(data, dict):
        return None

    amount = None
    raw_amount = data.get('amount')
    if raw_amount is not None:
        try:
            amount = Decimal(str(raw_amount).replace(',', '')).quantize(Decimal('0.01'))
        except (InvalidOperation, ValueError):
            amount = None
    currency = str(data.get('currency') or '').upper()[:3]
    if currency == 'KZ':
        currency = 'AOA'
    conf = data.get('confidence')
    try:
        confidence = float(conf)
    except (TypeError, ValueError):
        confidence = 0.5

    return {
        'merchant': str(data.get('merchant') or '')[:200],
        'amount': amount,
        'currency': currency,
        'date': str(data.get('date') or '')[:10],
        'confidence': max(0.0, min(confidence, 1.0)),
        'raw_text': str(data.get('raw_text') or '')[:8000],
    }
