"""
Notifica utilizadores 7, 3 e 1 dias antes da subscrição do app móvel expirar.
Canais: email, push, SMS e WhatsApp.
Executar diariamente (cron): python manage.py send_subscription_expiry_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from subscriptions.models import MobileAppSubscription
from subscriptions.notify import send_subscription_reminders


REMINDER_DAYS = (7, 3, 1)


class Command(BaseCommand):
    help = 'Envia lembretes (email, push, SMS, WhatsApp) 7, 3 e 1 dias antes da expiração'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas listar quem seria notificado, sem enviar',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        to_notify = []

        for sub in MobileAppSubscription.objects.filter(status__in=['trial', 'active']).select_related('user'):
            end_date = None
            if sub.status == 'trial' and sub.trial_ends_at:
                end_date = sub.trial_ends_at.date()
            elif sub.status == 'active' and sub.subscription_ends_at:
                end_date = sub.subscription_ends_at.date()
            if not end_date:
                continue
            days_left = (end_date - now.date()).days
            if days_left not in REMINDER_DAYS:
                continue
            if self._already_sent(sub, days_left):
                continue
            to_notify.append((sub, end_date, days_left))

        if not to_notify:
            self.stdout.write(self.style.SUCCESS('Nenhum aviso a enviar.'))
            return

        self.stdout.write(f'Encontrados {len(to_notify)} utilizador(es) a notificar.')

        for sub, end_date, days_left in to_notify:
            user = sub.user
            self.stdout.write(f'  - {user.email} (expira em {end_date}, {days_left}d)')
            if dry_run:
                continue
            try:
                results = send_subscription_reminders(
                    user,
                    sub,
                    channels=['email', 'push', 'sms', 'whatsapp'],
                    days=days_left,
                )
                self.stdout.write(self.style.SUCCESS(f'  Enviado {results}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Erro ao enviar para {user.email}: {e}'))

    def _already_sent(self, sub, days_left):
        if days_left == 7:
            return bool(sub.reminder_7d_sent_at)
        if days_left == 1:
            return bool(sub.reminder_1d_sent_at)
        return bool(sub.reminder_3d_sent_at or sub.expiry_reminder_sent_at)
