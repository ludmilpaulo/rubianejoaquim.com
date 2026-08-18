"""Private receipt file access — authorized signed URLs or direct stream."""
from __future__ import annotations

import hashlib
import hmac
import time
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.signing import BadSignature, TimestampSigner

if TYPE_CHECKING:
    from finance.models import Receipt

RECEIPT_URL_MAX_AGE = getattr(settings, 'RECEIPT_SIGNED_URL_MAX_AGE', 3600)


def generate_receipt_access_token(receipt_id: int, user_id: int) -> str:
    signer = TimestampSigner(salt='zenda-receipt-file')
    return signer.sign(f'{receipt_id}:{user_id}')


def verify_receipt_access_token(token: str, receipt_id: int, user_id: int) -> bool:
    signer = TimestampSigner(salt='zenda-receipt-file')
    try:
        value = signer.unsign(token, max_age=RECEIPT_URL_MAX_AGE)
    except BadSignature:
        return False
    return value == f'{receipt_id}:{user_id}'


def get_receipt_file_url(receipt: Receipt, request) -> str | None:
    """Return an authorized URL for the receipt image (signed query param)."""
    if not receipt.file:
        return None
    token = generate_receipt_access_token(receipt.id, receipt.user_id)
    base = request.build_absolute_uri(f'/api/finance/receipts/{receipt.id}/file/')
    return f'{base}?token={token}'
