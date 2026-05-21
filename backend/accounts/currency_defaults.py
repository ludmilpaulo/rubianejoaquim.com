"""Default currency by user region (Angola → AOA, elsewhere → USD)."""

ANGOLA_REGION_CODE = 'AO'
DEFAULT_CURRENCY_ANGOLA = 'AOA'
DEFAULT_CURRENCY_INTERNATIONAL = 'USD'

SUPPORTED_CURRENCIES = frozenset({
    'AOA', 'USD', 'EUR', 'GBP', 'BRL', 'ZAR', 'MZN', 'CAD',
})


def default_currency_for_region(region_code: str | None) -> str:
    if region_code and region_code.upper() == ANGOLA_REGION_CODE:
        return DEFAULT_CURRENCY_ANGOLA
    return DEFAULT_CURRENCY_INTERNATIONAL


def normalize_currency(code: str | None) -> str:
    if code and code.upper() in SUPPORTED_CURRENCIES:
        return code.upper()
    return DEFAULT_CURRENCY_INTERNATIONAL
