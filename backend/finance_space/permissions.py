from subscriptions.permissions import require_feature, user_has_feature

from .models import FinanceSpaceMember


def user_has_shared_finance(user) -> bool:
    return user_has_feature(user, 'shared_finance')


HasSharedFinance = require_feature('shared_finance')


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
