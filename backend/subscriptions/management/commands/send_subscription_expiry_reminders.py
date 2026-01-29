"""
Notifica utilizadores 3 dias antes da subscrição do app móvel expirar.
Executar diariamente (cron): python manage.py send_subscription_expiry_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from subscriptions.models import MobileAppSubscription


class Command(BaseCommand):
    help = 'Envia email 3 dias antes da subscrição do app móvel expirar'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas listar quem seria notificado, sem enviar',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()
        in_3_days = now.date() + timedelta(days=3)

        # Subscrições que expiram em 3 dias (trial ou subscrição paga)
        to_notify = []
        for sub in MobileAppSubscription.objects.filter(status__in=['trial', 'active']):
            end_date = None
            is_trial = False
            if sub.status == 'trial' and sub.trial_ends_at:
                end_date = sub.trial_ends_at.date()
                is_trial = True
            elif sub.status == 'active' and sub.subscription_ends_at:
                end_date = sub.subscription_ends_at.date()
            if end_date and end_date == in_3_days:
                if not sub.expiry_reminder_sent_at:
                    to_notify.append((sub, end_date, is_trial))

        if not to_notify:
            self.stdout.write(self.style.SUCCESS('Nenhum aviso a enviar.'))
            return

        self.stdout.write(f'Encontrados {len(to_notify)} utilizador(es) a notificar (expira em 3 dias).')

        for sub, end_date in to_notify:
            user = sub.user
            self.stdout.write(f'  - {user.email} (expira em {end_date})')
            if dry_run:
                continue

            # Marcar como enviado antes de enviar (evitar duplicados se falhar o envio)
            sub.expiry_reminder_sent_at = now
            sub.save(update_fields=['expiry_reminder_sent_at'])

            # Enviar email
            try:
                self._send_reminder_email(user, end_date, sub.status)
                self.stdout.write(self.style.SUCCESS(f'  Email enviado para {user.email}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Erro ao enviar para {user.email}: {e}'))
                sub.expiry_reminder_sent_at = None
                sub.save(update_fields=['expiry_reminder_sent_at'])

    def _send_reminder_email(self, user, end_date, status):
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags

        subject = 'Zenda – A sua subscrição expira em 3 dias'
        message_plain = (
            f'Olá {user.first_name or user.email},\n\n'
            f'A sua subscrição do app Zenda expira no dia {end_date}.\n\n'
            'Para continuar a usar o app, faça o pagamento da renovação mensal e '
            'envie o comprovativo na aplicação (ou entre em contacto connosco).\n\n'
            'Obrigado,\n'
            'Equipa Rubiane Joaquim Educação Financeira'
        )
        recipient = [user.email]
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com')
        send_mail(subject, message_plain, from_email, recipient, fail_silently=False)
