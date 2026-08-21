from django.db import migrations


def backfill_ledger(apps, schema_editor):
    Proof = apps.get_model('subscriptions', 'MobileAppSubscriptionPaymentProof')
    Payment = apps.get_model('subscriptions', 'SubscriptionPayment')
    status_map = {
        'pending': 'pending_verification',
        'info_requested': 'info_requested',
        'approved': 'paid',
        'rejected': 'rejected',
    }
    for proof in Proof.objects.select_related('subscription', 'subscription__user').all():
        if Payment.objects.filter(proof_id=proof.id).exists():
            continue
        sub = proof.subscription
        user = sub.user
        amount = proof.amount if proof.amount is not None else 10000
        currency = proof.currency or 'AOA'
        Payment.objects.create(
            user=user,
            subscription=sub,
            plan_tier=getattr(sub, 'plan_tier', None) or 'premium',
            country=getattr(user, 'country', '') or 'AO',
            amount=amount,
            currency=currency,
            plan_amount=amount,
            plan_currency=currency,
            method='proof_of_payment',
            gateway='none',
            status=status_map.get(proof.status, 'pending_verification'),
            external_id=f'POP-MIG-{proof.id:06d}',
            proof=proof,
            activated_at=proof.reviewed_at if proof.status == 'approved' else None,
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('subscriptions', '0004_paymentgatewayconfig_subscriptionbillingsettings_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_ledger, noop),
    ]
