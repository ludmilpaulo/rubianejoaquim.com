from .models import SubscriptionAdminAuditLog


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()[:45]
    return request.META.get('REMOTE_ADDR')


def record_admin_action(
    request,
    action,
    *,
    subscription=None,
    payment_proof=None,
    result='success',
    details=None,
):
    customer_email = ''
    if subscription is not None:
        customer_email = getattr(subscription.user, 'email', '') or ''
    elif payment_proof is not None:
        customer_email = getattr(payment_proof.subscription.user, 'email', '') or ''
    user_agent = (request.META.get('HTTP_USER_AGENT') or '')[:400]
    return SubscriptionAdminAuditLog.objects.create(
        admin=request.user if request.user.is_authenticated else None,
        action=action,
        subscription=subscription,
        payment_proof=payment_proof,
        customer_email=customer_email,
        result=result,
        details=details or {},
        ip_address=client_ip(request),
        user_agent=user_agent,
    )
