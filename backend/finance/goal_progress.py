"""Goal progress in-app notifications. Device OS notifications are scheduled on mobile."""
from __future__ import annotations

from decimal import Decimal

from django.db.models import Q


def notify_goal_progress(goal, previous_amount: Decimal) -> list[str]:
    """Create in-app notifications at 75% and 100%. Returns event names. Never duplicates."""
    events: list[str] = []
    if goal.target_amount <= 0:
        return events

    previous_pct = (previous_amount / goal.target_amount) * 100
    current_pct = (goal.current_amount / goal.target_amount) * 100

    try:
        from tasks.models import Notification
    except Exception:
        Notification = None  # type: ignore[misc, assignment]

    if current_pct >= 75 and previous_pct < 75 and not goal.progress_notified_75:
        goal.progress_notified_75 = True
        events.append('75')
        if Notification is not None:
            exists = Notification.objects.filter(
                user=goal.user,
                notification_type='target_milestone',
                related_object_type='goal',
                related_object_id=goal.id,
            ).filter(Q(title__icontains='75') | Q(message__icontains='75')).exists()
            if not exists:
                Notification.objects.create(
                    user=goal.user,
                    title='Goal progress',
                    message=f'You are 75% of the way to your savings goal "{goal.title}".',
                    notification_type='target_milestone',
                    related_object_type='goal',
                    related_object_id=goal.id,
                )

    if goal.status == 'completed' and not goal.progress_notified_100:
        goal.progress_notified_100 = True
        events.append('100')
        if Notification is not None:
            exists = Notification.objects.filter(
                user=goal.user,
                notification_type='goal_achievement',
                related_object_type='goal',
                related_object_id=goal.id,
            ).exists()
            if not exists:
                Notification.objects.create(
                    user=goal.user,
                    title='Goal reached',
                    message=f'You have reached your goal "{goal.title}".',
                    notification_type='goal_achievement',
                    related_object_type='goal',
                    related_object_id=goal.id,
                )

    if events:
        goal.save(update_fields=['progress_notified_75', 'progress_notified_100', 'updated_at'])
    return events
