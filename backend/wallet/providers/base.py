"""Payment provider abstraction — plug licensed providers without hard-coding."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class ProviderResult:
    success: bool
    provider_reference: str
    status: str
    message: str = ''
    raw: dict[str, Any] | None = None


class PaymentProvider(ABC):
    code: str = 'base'

    @abstractmethod
    def create_deposit(self, *, amount: Decimal, currency: str, user_id: int, metadata: dict) -> ProviderResult:
        ...

    @abstractmethod
    def create_withdrawal(self, *, amount: Decimal, currency: str, user_id: int, metadata: dict) -> ProviderResult:
        ...

    @abstractmethod
    def send_transfer(
        self, *, amount: Decimal, currency: str, user_id: int, beneficiary_ref: str, metadata: dict
    ) -> ProviderResult:
        ...

    @abstractmethod
    def get_transaction_status(self, provider_reference: str) -> ProviderResult:
        ...

    @abstractmethod
    def refund(self, provider_reference: str) -> ProviderResult:
        ...

    @abstractmethod
    def get_quote(self, *, amount: Decimal, from_currency: str, to_currency: str) -> dict[str, Any]:
        ...

    @abstractmethod
    def verify_webhook(self, payload: bytes, headers: dict) -> tuple[bool, dict[str, Any]]:
        ...
