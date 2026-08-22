"""
Django settings for Rubiane Joaquim Educação Financeira project.
"""

from pathlib import Path
from decouple import config
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

# Allow all hosts in development, or specific hosts from env
if DEBUG:
    ALLOWED_HOSTS = ['*']  # Allow all hosts in development
else:
    ALLOWED_HOSTS = config(
        'ALLOWED_HOSTS',
        default='ludmilpaulo.pythonanywhere.com,localhost,127.0.0.1',
        cast=lambda v: [s.strip() for s in v.split(',')]
    )


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'instructors',
    'courses',
    'mentorship',
    'accounts',
    'finance',
    'tasks',
    'ai_copilot',
    'subscriptions',
    'portfolio',
    'finance_space',
    'wallet',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
    # Para produção, usar PostgreSQL:
    # 'default': {
    #     'ENGINE': 'django.db.backends.postgresql',
    #     'NAME': config('DB_NAME'),
    #     'USER': config('DB_USER'),
    #     'PASSWORD': config('DB_PASSWORD'),
    #     'HOST': config('DB_HOST', default='localhost'),
    #     'PORT': config('DB_PORT', default='5432'),
    # }
}


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'pt-pt'
TIME_ZONE = 'Europe/Lisbon'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/
# PythonAnywhere Web tab must map these to the same directories:
#   /static/ -> /home/ludmilpaulo/rubianejoaquim.com/backend/staticfiles
#   /media/  -> /home/ludmilpaulo/rubianejoaquim.com/backend/media

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_RATES': {
        'auth_burst': '30/min',
        'auth_user': '60/min',
        'fx_anon': '120/min',
        'fx_user': '300/min',
    },
}

# CORS
_cors_default = 'http://localhost:3000,http://127.0.0.1:3000,https://www.rubianejoaquim.com,https://rubianejoaquim.com'
CORS_ALLOWED_ORIGINS = [
    s.strip()
    for s in config('CORS_ALLOWED_ORIGINS', default=_cors_default).split(',')
    if s.strip()
]

# Allow all origins in development (for mobile app)
CORS_ALLOW_ALL_ORIGINS = DEBUG

CORS_ALLOW_CREDENTIALS = True

# Email Configuration (SMTP - e.g. GoDaddy Secure Server)
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtpout.secureserver.net')
EMAIL_PORT = config('EMAIL_PORT', default=465, cast=int)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=True, cast=bool)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='support@maindodigital.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='support@maindodigital.com')

# Frontend URL for email links (production: https://www.rubianejoaquim.com)
FRONTEND_URL = config('FRONTEND_URL', default='https://www.rubianejoaquim.com')

# Password reset link validity (seconds). Default 24 hours.
PASSWORD_RESET_TIMEOUT = config('PASSWORD_RESET_TIMEOUT', default=86400, cast=int)

# OpenAI Configuration for AI Financial Copilot
# Get your API key from: https://platform.openai.com/api-keys
# Add it to your .env file as: OPENAI_API_KEY=sk-...
OPENAI_API_KEY = config('OPENAI_API_KEY', default=None)
OPENAI_MODEL = config('OPENAI_MODEL', default='gpt-4o-mini')

# Mobile App (Zenda) subscription payment
SUBSCRIPTION_MONTHLY_PRICE_KZ = config('SUBSCRIPTION_MONTHLY_PRICE_KZ', default=10000, cast=int)
SUBSCRIPTION_MONTHLY_PRICE_ZAR = config('SUBSCRIPTION_MONTHLY_PRICE_ZAR', default='180')
SUBSCRIPTION_IBAN = config('SUBSCRIPTION_IBAN', default='0040 0000 4047.9796.1015.9')
SUBSCRIPTION_PAYEE_NAME = config('SUBSCRIPTION_PAYEE_NAME', default='Rubiane Patricia Fernando Joaquim')

# iKhokha iK Pay API — optional env fallbacks. Prefer Admin → Settings → Payments.
# Never expose these to web/mobile clients.
IKHOKHA_APP_ID = config('IKHOKHA_APP_ID', default='')
IKHOKHA_APP_SECRET = config('IKHOKHA_APP_SECRET', default='')
IKHOKHA_ENVIRONMENT = config('IKHOKHA_ENVIRONMENT', default='sandbox')
IKHOKHA_API_BASE_URL = config('IKHOKHA_API_BASE_URL', default='https://api.ikhokha.com/public-api/v1')
IKHOKHA_PAYMENT_URL = config('IKHOKHA_PAYMENT_URL', default='https://api.ikhokha.com/public-api/v1/api/payment')
IKHOKHA_CALLBACK_URL = config('IKHOKHA_CALLBACK_URL', default='')

# Mobile App (Zenda) store update check - bump when you publish a new version
APP_LATEST_VERSION_IOS = config('APP_LATEST_VERSION_IOS', default='1.0.12')
APP_LATEST_VERSION_ANDROID = config('APP_LATEST_VERSION_ANDROID', default='1.0.12')
APP_MINIMUM_VERSION_IOS = config('APP_MINIMUM_VERSION_IOS', default='1.0.0')
APP_MINIMUM_VERSION_ANDROID = config('APP_MINIMUM_VERSION_ANDROID', default='1.0.0')
APP_FORCE_UPDATE = config('APP_FORCE_UPDATE', default=False, cast=bool)
APP_UPDATE_MESSAGE_EN = config(
    'APP_UPDATE_MESSAGE_EN',
    default='A new version of Zenda is required. Please update to continue.',
)
APP_UPDATE_MESSAGE_PT = config(
    'APP_UPDATE_MESSAGE_PT',
    default='É necessária uma nova versão da Zenda. Atualize para continuar.',
)
APP_UPDATE_MESSAGE_FR = config(
    'APP_UPDATE_MESSAGE_FR',
    default='Une nouvelle version de Zenda est requise. Veuillez mettre à jour pour continuer.',
)
APP_UPDATE_MESSAGE_ES = config(
    'APP_UPDATE_MESSAGE_ES',
    default='Se requiere una nueva versión de Zenda. Actualice para continuar.',
)
APP_STORE_URL_IOS = config('APP_STORE_URL_IOS', default='https://apps.apple.com/app/id6758412176') or 'https://apps.apple.com/app/id6758412176'
APP_STORE_URL_ANDROID = config(
    'APP_STORE_URL_ANDROID',
    default='https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda',
) or 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda'

# Apple In-App Purchase (Guideline 3.1.1) - for receipt verification
# App Store Connect → Your App → App Information → App-Specific Shared Secret
APPLE_SHARED_SECRET = config('APPLE_SHARED_SECRET', default=None)
APPLE_BUNDLE_ID = config('APPLE_BUNDLE_ID', default='com.rubianejoaquim.zenda')
# Sign in with Apple — comma-separated extra JWT audiences (e.g. Services ID for web)
APPLE_SIGN_IN_AUDIENCES = config('APPLE_SIGN_IN_AUDIENCES', default='')
APPLE_SIGN_IN_ENABLED = config('APPLE_SIGN_IN_ENABLED', default=True, cast=bool)

# ---------------------------------------------------------------------------
# Social login (Google / Facebook / TikTok)
# Secrets must stay server-side only. Never expose CLIENT_SECRET / APP_SECRET.
# Use separate credentials for development vs production.
# ---------------------------------------------------------------------------
API_PUBLIC_URL = config('API_PUBLIC_URL', default='https://ludmilpaulo.pythonanywhere.com')

GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = config('GOOGLE_CLIENT_SECRET', default='')  # server-only; GIS web often needs ID only
GOOGLE_CLIENT_ID_IOS = config('GOOGLE_CLIENT_ID_IOS', default='')
GOOGLE_CLIENT_ID_ANDROID = config('GOOGLE_CLIENT_ID_ANDROID', default='')

FACEBOOK_APP_ID = config('FACEBOOK_APP_ID', default='')
FACEBOOK_APP_SECRET = config('FACEBOOK_APP_SECRET', default='')

TIKTOK_CLIENT_KEY = config('TIKTOK_CLIENT_KEY', default='')
TIKTOK_CLIENT_SECRET = config('TIKTOK_CLIENT_SECRET', default='')
TIKTOK_REDIRECT_URI = config(
    'TIKTOK_REDIRECT_URI',
    default='',  # falls back to API_PUBLIC_URL + /api/auth/social/tiktok/callback/
)
TIKTOK_SCOPES = config('TIKTOK_SCOPES', default='user.info.basic')

# Mobile deep-link target after TikTok OAuth (must match app scheme)
MOBILE_OAUTH_REDIRECT_URI = config('MOBILE_OAUTH_REDIRECT_URI', default='zenda://social-callback')

# Receipt signed URL validity (seconds)
RECEIPT_SIGNED_URL_MAX_AGE = config('RECEIPT_SIGNED_URL_MAX_AGE', default=3600, cast=int)

# Wallet — must remain False until licensed provider + KYC signed off
WALLET_LIVE_ENABLED = config('WALLET_LIVE_ENABLED', default=False, cast=bool)

# Subscription reminder channels (push / SMS / WhatsApp)
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN', default='')
TWILIO_SMS_FROM = config('TWILIO_SMS_FROM', default='')
WHATSAPP_PROVIDER_NUMBER = config('WHATSAPP_PROVIDER_NUMBER', default='+27659031894')
TWILIO_WHATSAPP_FROM = config(
    'TWILIO_WHATSAPP_FROM',
    default=f"whatsapp:{WHATSAPP_PROVIDER_NUMBER}" if WHATSAPP_PROVIDER_NUMBER else '',
)
# Free WhatsApp gateway (GREEN-API). Link +27659031894 via QR in their console.
GREEN_API_ID_INSTANCE = config('GREEN_API_ID_INSTANCE', default='')
GREEN_API_API_TOKEN = config('GREEN_API_API_TOKEN', default='')
GREEN_API_URL = config('GREEN_API_URL', default='https://api.green-api.com')
WHATSAPP_ACCESS_TOKEN = config('WHATSAPP_ACCESS_TOKEN', default='')
WHATSAPP_PHONE_NUMBER_ID = config('WHATSAPP_PHONE_NUMBER_ID', default='')
WHATSAPP_TEMPLATE_NAME = config('WHATSAPP_TEMPLATE_NAME', default='')
WHATSAPP_TEMPLATE_LANG = config('WHATSAPP_TEMPLATE_LANG', default='pt')
WHATSAPP_WEBHOOK_URL = config('WHATSAPP_WEBHOOK_URL', default='')
WHATSAPP_WEBHOOK_TOKEN = config('WHATSAPP_WEBHOOK_TOKEN', default='')
SMS_WEBHOOK_URL = config('SMS_WEBHOOK_URL', default='')
SMS_WEBHOOK_TOKEN = config('SMS_WEBHOOK_TOKEN', default='')

# Live FX: skip outbound fetch while last successful write is this young.
# Stale flag uses FX_STALE_AFTER_HOURS against our last live write, not the provider clock
# (daily APIs often have quote timestamps many hours old while still being current).
FX_CACHE_TTL_HOURS = config('FX_CACHE_TTL_HOURS', default=1, cast=int)
FX_STALE_AFTER_HOURS = config('FX_STALE_AFTER_HOURS', default=24, cast=int)
