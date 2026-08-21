"""Outbound reminder channels: email, Expo push, SMS, WhatsApp."""
from __future__ import annotations

import logging
import re

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
TWILIO_MESSAGES_URL = 'https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json'
WHATSAPP_GRAPH_URL = 'https://graph.facebook.com/v21.0/{phone_id}/messages'


def reminder_copy(user, subscription, days):
    name = user.first_name or user.email or 'cliente'
    end = subscription.renewal_at
    end_label = end.strftime('%d/%m/%Y') if end else ''
    plan = subscription.plan_tier or 'premium'
    if end_label:
        body = (
            f'Olá {name}, a sua subscrição Zenda ({plan}) expira em {end_label} '
            f'({days} dia(s)). Renove e envie o comprovativo para manter o acesso.'
        )
    else:
        body = (
            f'Olá {name}, a sua subscrição Zenda ({plan}) está prestes a expirar. '
            'Renove e envie o comprovativo para manter o acesso.'
        )
    title = f'Zenda – renovação em {days} dia(s)'
    return title, body


def normalize_msisdn(phone: str | None) -> str | None:
    digits = re.sub(r'\D', '', phone or '')
    if not digits:
        return None
    if digits.startswith('00'):
        digits = digits[2:]
    if len(digits) == 9 and digits[0] == '9':
        digits = f'244{digits}'
    if len(digits) < 10:
        return None
    return f'+{digits}'


def whatsapp_from_number():
    configured = (getattr(settings, 'TWILIO_WHATSAPP_FROM', '') or '').strip()
    provider = (getattr(settings, 'WHATSAPP_PROVIDER_NUMBER', '') or '').strip()
    if configured:
        return configured if configured.startswith('whatsapp:') else f'whatsapp:{configured}'
    if provider:
        msisdn = normalize_msisdn(provider) or provider
        return f'whatsapp:{msisdn}'
    return ''


def _twilio_configured():
    return bool(getattr(settings, 'TWILIO_ACCOUNT_SID', '') and getattr(settings, 'TWILIO_AUTH_TOKEN', ''))


def _whatsapp_cloud_configured():
    return bool(
        getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
        and getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    )


def _green_api_configured():
    return bool(
        getattr(settings, 'GREEN_API_ID_INSTANCE', '')
        and getattr(settings, 'GREEN_API_API_TOKEN', '')
    )


def whatsapp_chat_id(msisdn: str) -> str:
    return f"{re.sub(r'\D', '', msisdn)}@c.us"


def _green_api_send(to_msisdn: str, body: str):
    instance = getattr(settings, 'GREEN_API_ID_INSTANCE', '').strip()
    token = getattr(settings, 'GREEN_API_API_TOKEN', '').strip()
    host = (getattr(settings, 'GREEN_API_URL', '') or 'https://api.green-api.com').rstrip('/')
    url = f'{host}/waInstance{instance}/sendMessage/{token}'
    payload = {
        'chatId': whatsapp_chat_id(to_msisdn),
        'message': body,
        'linkPreview': False,
    }
    try:
        response = requests.post(url, json=payload, timeout=15)
        if response.status_code in (200, 201):
            return True, 'sent'
        logger.warning('GREEN-API HTTP %s: %s', response.status_code, response.text[:300])
        return False, 'send_failed'
    except requests.RequestException:
        logger.exception('GREEN-API request failed')
        return False, 'send_failed'


def send_email_channel(user, title, body):
    if not user.email:
        return 'no_email'
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com')
    try:
        send_mail(title, body, from_email, [user.email], fail_silently=False)
        return 'sent'
    except Exception:
        logger.exception('Email reminder failed for %s', user.email)
        return 'send_failed'


def send_push_channel(user, title, body, subscription):
    from tasks.models import Notification

    Notification.objects.create(
        user=user,
        title=title,
        message=body,
        notification_type='subscription_reminder',
        action_url='/profile',
        related_object_type='subscription',
        related_object_id=subscription.id,
    )
    from accounts.models import DevicePushToken

    tokens = list(
        DevicePushToken.objects.filter(user=user, is_active=True).values_list('token', flat=True)
    )
    if not tokens:
        return 'sent'
    payload = [
        {
            'to': token,
            'title': title,
            'body': body,
            'sound': 'default',
            'channelId': 'subscription_reminders',
            'data': {
                'screen': 'Profile',
                'type': 'subscription_reminder',
                'subscription_id': subscription.id,
            },
        }
        for token in tokens
    ]
    try:
        response = requests.post(EXPO_PUSH_URL, json=payload, timeout=12)
        if response.status_code >= 400:
            logger.warning('Expo push HTTP %s: %s', response.status_code, response.text[:300])
            return 'sent'
        data = response.json() if response.content else {}
        tickets = data.get('data') or []
        invalid = []
        for token, ticket in zip(tokens, tickets):
            if isinstance(ticket, dict) and ticket.get('status') == 'error':
                details = ticket.get('details') or {}
                if details.get('error') == 'DeviceNotRegistered':
                    invalid.append(token)
        if invalid:
            DevicePushToken.objects.filter(token__in=invalid).update(is_active=False)
        return 'sent'
    except requests.RequestException:
        logger.exception('Expo push failed for user %s', user.id)
        return 'sent'


def _twilio_send(to_msisdn: str, body: str, *, whatsapp: bool):
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    if whatsapp:
        from_number = whatsapp_from_number() or getattr(settings, 'TWILIO_SMS_FROM', '')
        if from_number and not from_number.startswith('whatsapp:'):
            from_number = f'whatsapp:{from_number}'
        to_number = f'whatsapp:{to_msisdn}'
    else:
        from_number = getattr(settings, 'TWILIO_SMS_FROM', '')
        to_number = to_msisdn
    if not from_number:
        return False, 'missing_from'
    url = TWILIO_MESSAGES_URL.format(sid=sid)
    try:
        response = requests.post(
            url,
            data={'From': from_number, 'To': to_number, 'Body': body},
            auth=(sid, token),
            timeout=12,
        )
        if response.status_code in (200, 201):
            return True, 'sent'
        logger.warning('Twilio HTTP %s: %s', response.status_code, response.text[:300])
        return False, 'send_failed'
    except requests.RequestException:
        logger.exception('Twilio request failed')
        return False, 'send_failed'


def _whatsapp_cloud_send(to_msisdn: str, body: str, user_name: str, days: int, end_label: str):
    token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
    phone_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
    template = getattr(settings, 'WHATSAPP_TEMPLATE_NAME', '')
    lang = getattr(settings, 'WHATSAPP_TEMPLATE_LANG', 'pt') or 'pt'
    url = WHATSAPP_GRAPH_URL.format(phone_id=phone_id)
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    to = to_msisdn.lstrip('+')
    if template:
        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': 'template',
            'template': {
                'name': template,
                'language': {'code': lang},
                'components': [
                    {
                        'type': 'body',
                        'parameters': [
                            {'type': 'text', 'text': user_name or 'cliente'},
                            {'type': 'text', 'text': str(days)},
                            {'type': 'text', 'text': end_label or 'em breve'},
                        ],
                    }
                ],
            },
        }
    else:
        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': 'text',
            'text': {'body': body, 'preview_url': False},
        }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=12)
        if response.status_code in (200, 201):
            return True, 'sent'
        logger.warning('WhatsApp Cloud HTTP %s: %s', response.status_code, response.text[:300])
        return False, 'send_failed'
    except requests.RequestException:
        logger.exception('WhatsApp Cloud request failed')
        return False, 'send_failed'


def send_sms_channel(user, body):
    msisdn = normalize_msisdn(user.phone)
    if not msisdn:
        return 'no_phone'
    if _twilio_configured() and getattr(settings, 'TWILIO_SMS_FROM', ''):
        ok, code = _twilio_send(msisdn, body, whatsapp=False)
        return 'sent' if ok else code
    webhook = getattr(settings, 'SMS_WEBHOOK_URL', '')
    if webhook:
        try:
            response = requests.post(
                webhook,
                json={'to': msisdn, 'body': body, 'channel': 'sms'},
                headers={'Authorization': f"Bearer {getattr(settings, 'SMS_WEBHOOK_TOKEN', '')}"}
                if getattr(settings, 'SMS_WEBHOOK_TOKEN', '')
                else {},
                timeout=12,
            )
            return 'sent' if response.status_code < 400 else 'send_failed'
        except requests.RequestException:
            logger.exception('SMS webhook failed')
            return 'send_failed'
    logger.warning('SMS channel is enabled but no Twilio/webhook credentials are set')
    return 'send_failed'


def send_whatsapp_channel(user, body, days, end_label):
    msisdn = normalize_msisdn(user.phone)
    if not msisdn:
        return 'no_phone'
    if _green_api_configured():
        ok, code = _green_api_send(msisdn, body)
        return 'sent' if ok else code
    if _whatsapp_cloud_configured():
        ok, code = _whatsapp_cloud_send(
            msisdn, body, user.first_name or user.email or '', days, end_label
        )
        return 'sent' if ok else code
    if _twilio_configured() and (whatsapp_from_number() or getattr(settings, 'TWILIO_SMS_FROM', '')):
        ok, code = _twilio_send(msisdn, body, whatsapp=True)
        return 'sent' if ok else code
    webhook = getattr(settings, 'WHATSAPP_WEBHOOK_URL', '') or getattr(settings, 'SMS_WEBHOOK_URL', '')
    if webhook:
        try:
            response = requests.post(
                webhook,
                json={'to': msisdn, 'body': body, 'channel': 'whatsapp'},
                headers={'Authorization': f"Bearer {getattr(settings, 'WHATSAPP_WEBHOOK_TOKEN', '') or getattr(settings, 'SMS_WEBHOOK_TOKEN', '')}"}
                if getattr(settings, 'WHATSAPP_WEBHOOK_TOKEN', '') or getattr(settings, 'SMS_WEBHOOK_TOKEN', '')
                else {},
                timeout=12,
            )
            return 'sent' if response.status_code < 400 else 'send_failed'
        except requests.RequestException:
            logger.exception('WhatsApp webhook failed')
            return 'send_failed'
    logger.warning('WhatsApp channel is enabled but GREEN-API/Cloud/Twilio/webhook credentials are not set')
    return 'send_failed'


def send_subscription_reminders(user, subscription, channels=None, days=3):
    channels = channels or ['email', 'push', 'sms', 'whatsapp']
    title, body = reminder_copy(user, subscription, days)
    end = subscription.renewal_at
    end_label = end.strftime('%d/%m/%Y') if end else ''
    results = {}
    if 'email' in channels:
        results['email'] = send_email_channel(user, title, body)
    if 'push' in channels:
        results['push'] = send_push_channel(user, title, body, subscription)
    if 'sms' in channels:
        results['sms'] = send_sms_channel(user, body)
    if 'whatsapp' in channels:
        results['whatsapp'] = send_whatsapp_channel(user, body, days, end_label)

    if any(results.get(ch) == 'sent' for ch in ('email', 'push', 'sms', 'whatsapp')):
        now = timezone.now()
        if days >= 7:
            subscription.reminder_7d_sent_at = now
        elif days <= 1:
            subscription.reminder_1d_sent_at = now
        else:
            subscription.reminder_3d_sent_at = now
            subscription.expiry_reminder_sent_at = now
        subscription.save(update_fields=[
            'reminder_7d_sent_at', 'reminder_3d_sent_at',
            'reminder_1d_sent_at', 'expiry_reminder_sent_at', 'updated_at',
        ])
    return results
