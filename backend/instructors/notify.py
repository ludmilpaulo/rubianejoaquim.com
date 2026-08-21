"""Education marketplace notifications. Prefer user.preferred_locale."""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from config.locales import DEFAULT_LOCALE, normalize_locale

SUBJECTS = {
    'application_approved': {
        'pt': 'A sua candidatura de instrutor foi aprovada',
        'en': 'Your instructor application was approved',
        'fr': 'Votre candidature d’instructeur a été approuvée',
        'es': 'Su solicitud de instructor fue aprobada',
    },
    'application_rejected': {
        'pt': 'Atualização da candidatura de instrutor',
        'en': 'Instructor application update',
        'fr': 'Mise à jour de votre candidature',
        'es': 'Actualización de su solicitud',
    },
    'content_approved': {
        'pt': 'O seu conteúdo foi publicado',
        'en': 'Your content was published',
        'fr': 'Votre contenu a été publié',
        'es': 'Su contenido fue publicado',
    },
}


def send_locale_email(user, template_key: str, body: str):
    locale = normalize_locale(getattr(user, 'preferred_locale', None) or DEFAULT_LOCALE)
    subject = SUBJECTS.get(template_key, {}).get(locale) or SUBJECTS.get(template_key, {}).get('pt') or template_key
    email = EmailMultiAlternatives(
        subject=subject,
        body=body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com'),
        to=[user.email],
    )
    try:
        email.send()
        return True
    except Exception:
        return False
