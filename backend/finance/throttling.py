"""Rate limiting for public/sensitive finance endpoints."""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class FxAnonRateThrottle(AnonRateThrottle):
    scope = 'fx_anon'


class FxUserRateThrottle(UserRateThrottle):
    scope = 'fx_user'
