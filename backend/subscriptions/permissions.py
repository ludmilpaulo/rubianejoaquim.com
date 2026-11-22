"""Staff checks and plan-tier feature gates."""

from rest_framework.permissions import BasePermission

from subscriptions.tiers import has_feature


class IsStaffAdmin(BasePermission):
    """Staff or superuser only — financial admin endpoints."""

    message = 'Acesso negado. Apenas administradores.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser)
        )


def user_has_feature(user, feature: str) -> bool:
    """True when the user's effective plan includes this feature.

    Includes the platform complimentary-access window. Staff keep full access
    for support. Paid access alone does not unlock a feature the plan omits.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False):
        return True
    from subscriptions.billing import resolve_user_access

    access = resolve_user_access(user)
    if not access['has_access']:
        return False
    return has_feature(access['effective_tier'], feature)


def require_feature(feature: str):
    """DRF permission class that allows only users whose tier includes `feature`."""

    class FeaturePermission(BasePermission):
        message = 'This feature is not included in your current plan.'

        def has_permission(self, request, view):
            return user_has_feature(request.user, feature)

    FeaturePermission.__name__ = f'HasFeature_{feature}'
    FeaturePermission.feature = feature
    return FeaturePermission
