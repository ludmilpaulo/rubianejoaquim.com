"""Sandbox payment provider for QA — never use with real money."""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from .base import PaymentProvider, ProviderResult


class MockProvider(PaymentProvider):
    code = 'mock'

    def create_deposit(self, *, amount: Decimal, currency: str, user_id: int, metadata: dict) -> ProviderResult:
        ref = f'mock_dep_{uuid.uuid4().hex[:12]}'
        if metadata.get('simulate') == 'fail':
            return ProviderResult(False, ref, 'FAILED', 'Simulated failure')
        return ProviderResult(True, ref, 'COMPLETED', raw={'type': 'deposit'})

    def create_withdrawal(self, *, amount: Decimal, currency: str, user_id: int, metadata: dict) -> ProviderResult:
        ref = f'mock_wdr_{uuid.uuid4().hex[:12]}'
        if metadata.get('simulate') == 'fail':
            return ProviderResult(False, ref, 'FAILED', 'Insufficient provider balance (simulated)')
        return ProviderResult(True, ref, 'COMPLETED', raw={'type': 'withdrawal'})

    def send_transfer(
        self, *, amount: Decimal, currency: str, user_id: int, beneficiary_ref: str, metadata: dict
    ) -> ProviderResult:
        ref = f'mock_txf_{uuid.uuid4().hex[:12]}'
        if metadata.get('simulate') == 'fail':
            return ProviderResult(False, ref, 'FAILED', 'Invalid beneficiary (simulated)')
        if metadata.get('simulate') == 'timeout':
            return ProviderResult(True, ref, 'PROCESSING', raw={'type': 'transfer'})
        return ProviderResult(True, ref, 'COMPLETED', raw={'type': 'transfer'})

    def get_transaction_status(self, provider_reference: str) -> ProviderResult:
        return ProviderResult(True, provider_reference, 'COMPLETED')

    def refund(self, provider_reference: str) -> ProviderResult:
        return ProviderResult(True, f'refund_{provider_reference}', 'REFUNDED')

    def get_quote(self, *, amount: Decimal, from_currency: str, to_currency: str) -> dict[str, Any]:
        return {
            'from_currency': from_currency,
            'to_currency': to_currency,
            'amount': str(amount),
            'rate': '1',
            'converted': str(amount),
            'provider': self.code,
        }

    def verify_webhook(self, payload: bytes, headers: dict) -> tuple[bool, dict[str, Any]]:
        return True, {'provider_reference': headers.get('X-Mock-Ref', ''), 'status': 'COMPLETED'}


class EmisGpoProvider(PaymentProvider):
    code = 'emis_gpo'

    def _not_configured(self) -> ProviderResult:
        return ProviderResult(False, '', 'FAILED', 'EMIS GPO not configured — awaiting bank partnership')

    def create_deposit(self, **kwargs) -> ProviderResult:
        return self._not_configured()

    def create_withdrawal(self, **kwargs) -> ProviderResult:
        return self._not_configured()

    def send_transfer(self, **kwargs) -> ProviderResult:
        return self._not_configured()

    def get_transaction_status(self, provider_reference: str) -> ProviderResult:
        return self._not_configured()

    def refund(self, provider_reference: str) -> ProviderResult:
        return self._not_configured()

    def get_quote(self, **kwargs) -> dict[str, Any]:
        return {'error': 'not_configured'}

    def verify_webhook(self, payload: bytes, headers: dict) -> tuple[bool, dict[str, Any]]:
        return False, {}


class FlutterwaveProvider(PaymentProvider):
    code = 'flutterwave'

    def _not_configured(self) -> ProviderResult:
        return ProviderResult(False, '', 'FAILED', 'Flutterwave not configured — awaiting contract')

    def create_deposit(self, **kwargs) -> ProviderResult:
        return self._not_configured()

    def create_withdrawal(self, **kwargs) -> ProviderResult:
        return self._not_configured()

    def send_transfer(self, **kwargs) -> ProviderResult:
        return self._not_configured()

    def get_transaction_status(self, provider_reference: str) -> ProviderResult:
        return self._not_configured()

    def refund(self, provider_reference: str) -> ProviderResult:
        return self._not_configured()

    def get_quote(self, **kwargs) -> dict[str, Any]:
        return {'error': 'not_configured'}

    def verify_webhook(self, payload: bytes, headers: dict) -> tuple[bool, dict[str, Any]]:
        return False, {}


PROVIDERS: dict[str, PaymentProvider] = {
    'mock': MockProvider(),
    'emis_gpo': EmisGpoProvider(),
    'flutterwave': FlutterwaveProvider(),
}


def get_provider(code: str | None = None) -> PaymentProvider:
    from django.conf import settings
    if not getattr(settings, 'WALLET_LIVE_ENABLED', False):
        return PROVIDERS['mock']
    key = (code or 'mock').lower()
    return PROVIDERS.get(key, PROVIDERS['mock'])
