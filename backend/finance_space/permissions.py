from rest_framework.permissions import BasePermission, IsAuthenticated
from subscriptions.models import MobileAppSubscription
from subscriptions.tiers import effective_tier, has_feature

from .models import FinanceSpaceMember


def user_has_shared_finance(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    try:
        sub = user.mobile_app_subscription
    except MobileAppSubscription.DoesNotExist:
        return True
    if not sub.has_access:
        return False
    return has_feature(effective_tier(sub), 'shared_finance') or sub.has_access


class HasSharedFinance(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and user_has_shared_finance(request.user))


def active_membership(user, space):
    return FinanceSpaceMember.objects.filter(
        space=space, user=user, status='active'
    ).first()


def can_view_entry(user, entry) -> bool:
    if entry.user_id == user.id or entry.paid_by_id == user.id:
        return True
    membership = active_membership(user, entry.space)
    if not membership:
        return False
    if entry.visibility == 'private':
        return membership.role == 'owner'
    if entry.visibility == 'family':
        return True
    return entry.shares.filter(user=user).exists()
