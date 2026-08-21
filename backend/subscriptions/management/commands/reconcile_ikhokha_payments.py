from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from subscriptions.ikhokha import IkhokhaError, get_payment_status
from subscriptions.models import SubscriptionPayment
from subscriptions.payments import apply_ikhokha_provider_status


class Command(BaseCommand):
    help = 'Reconcile processing iKhokha payments that were interrupted.'

    def add_arguments(self, parser):
        parser.add_argument('--minutes', type=int, default=5)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=options['minutes'])
        qs = SubscriptionPayment.objects.filter(
            gateway=SubscriptionPayment.GATEWAY_IKHOKHA,
            status=SubscriptionPayment.STATUS_PROCESSING,
            created_at__lte=cutoff,
        )
        updated = 0
        for payment in qs:
            try:
                remote = get_payment_status(
                    paylink_id=payment.paylink_id,
                    external_id=payment.external_id,
                )
            except IkhokhaError:
                continue
            apply_ikhokha_provider_status(payment, remote.get('status') or '')
            updated += 1
        self.stdout.write(self.style.SUCCESS(f'Reconciled {updated} payment(s).'))
