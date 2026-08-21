from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from .models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, UserUpdateSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Verificar se há código de referência
        referral_code = request.data.get('referral_code')
        if referral_code:
            try:
                referrer = User.objects.get(referral_code=referral_code)
                user.referred_by = referrer
                user.save()
                try:
                    from .models import AppReferralEvent
                    AppReferralEvent.objects.create(
                        referral_code=referral_code,
                        referrer=referrer,
                        event_type=AppReferralEvent.EVENT_REGISTER,
                        platform=str(request.data.get('platform') or 'unknown')[:20],
                        user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:500],
                        ip_address=request.META.get('REMOTE_ADDR'),
                        created_user=user,
                    )
                except Exception:
                    pass
            except User.DoesNotExist:
                pass  # Ignorar código inválido
        
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    from django.utils import timezone
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        # Don't call login() for API token auth - it triggers CSRF checks
        # login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Atualizar perfil do usuário"""
    serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(request.user).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_push_token(request):
    """Register or refresh an Expo push token for the signed-in device."""
    from .models import DevicePushToken

    token = (request.data.get('token') or '').strip()
    platform = (request.data.get('platform') or '').strip().lower()
    if not token:
        return Response({'detail': 'token is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if platform not in ('ios', 'android', ''):
        platform = ''
    DevicePushToken.objects.filter(token=token).exclude(user=request.user).delete()
    obj, _created = DevicePushToken.objects.update_or_create(
        token=token,
        defaults={'user': request.user, 'platform': platform, 'is_active': True},
    )
    return Response({'ok': True, 'id': obj.id})


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def forgot_password(request):
    """Request password reset: send email with reset link. Always return 200 to avoid email enumeration."""
    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response(
            {'error': 'Email é obrigatório.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    user = User.objects.filter(email__iexact=email).first()
    if user and user.is_active:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com')
        reset_url = f'{frontend_url.rstrip("/")}/login/reset-password?uid={uid}&token={token}'
        subject = 'Redefinir palavra-passe - Zenda / Rubiane Joaquim'
        message = (
            f'Olá,\n\n'
            f'Recebemos um pedido para redefinir a palavra-passe da sua conta.\n\n'
            f'Clique no link abaixo para definir uma nova palavra-passe:\n{reset_url}\n\n'
            f'O link é válido por 24 horas. Se não solicitou esta alteração, ignore este email.\n\n'
            f'Com os melhores cumprimentos,\nRubiane Joaquim'
        )
        try:
            send_mail(
                subject,
                message,
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com'),
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {'error': 'Não foi possível enviar o email. Tente mais tarde.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
    return Response({
        'message': 'Se o email estiver registado, receberá um link para redefinir a palavra-passe.',
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def password_reset_confirm(request):
    """Confirm password reset with uid, token and new_password."""
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    if not uid or not token or not new_password:
        return Response(
            {'error': 'Parâmetros em falta: uid, token e new_password são obrigatórios.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if len(new_password) < 8:
        return Response(
            {'error': 'A nova palavra-passe deve ter pelo menos 8 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {'error': 'Link inválido ou expirado. Solicite um novo link de redefinição.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    if not default_token_generator.check_token(user, token):
        return Response(
            {'error': 'Link inválido ou expirado. Solicite um novo link de redefinição.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    user.set_password(new_password)
    user.save()
    return Response({
        'message': 'Palavra-passe alterada com sucesso. Pode entrar com a nova palavra-passe.',
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_account_deletion(request):
    """Solicitar exclusão de conta e dados associados"""
    user = request.user
    
    # Log the deletion request (for admin review)
    # In production, you might want to:
    # 1. Send an email to admin
    # 2. Store deletion request in a separate model
    # 3. Schedule actual deletion after a grace period
    
    # For now, we'll deactivate the account immediately
    # In production, consider a grace period (e.g., 30 days) before actual deletion
    user.is_active = False
    user.save()

    # Remove social-account links and app sessions so the user cannot re-auth into this account
    from .models import SocialAccount, OAuthState
    SocialAccount.objects.filter(user=user).delete()
    OAuthState.objects.filter(user=user).delete()
    Token.objects.filter(user=user).delete()

    return Response({
        'message': 'Sua solicitação de exclusão de conta foi recebida. Sua conta e dados associados serão removidos em breve.',
        'account_deactivated': True
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_app_update_notification(request):
    """Send app update notification email to all active users (admin only)"""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response(
            {'error': 'Acesso negado. Apenas administradores.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    app_version = request.data.get('app_version', 'Nova versão')
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com')
    
    users = User.objects.filter(is_active=True).exclude(email__isnull=True).exclude(email='')
    total_users = users.count()
    sent_count = 0
    failed_count = 0
    
    subject = f'📱 Nova Atualização do App Zenda Disponível! - Versão {app_version}'
    
    for user in users:
        try:
            html_message = render_to_string('emails/app_update_notification.html', {
                'user_name': user.first_name or user.username,
                'app_version': app_version,
                'frontend_url': frontend_url,
            })
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=f'Olá {user.first_name or user.username},\n\nUma nova atualização do App Zenda está disponível! Versão {app_version}.\n\nAtualize agora para aproveitar todas as melhorias e novos recursos.\n\nAcesse a App Store ou Google Play para atualizar.\n\nCom os melhores cumprimentos,\nRubiane Joaquim',
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com'),
                to=[user.email],
            )
            email.attach_alternative(html_message, 'text/html')
            email.send()
            sent_count += 1
        except Exception as e:
            print(f'Error sending email to {user.email}: {str(e)}')
            failed_count += 1
    
    return Response({
        'message': 'Notificações enviadas com sucesso!',
        'total_users': total_users,
        'sent_count': sent_count,
        'failed_count': failed_count,
    }, status=status.HTTP_200_OK)


DEFAULT_NOTIFICATION_PREFS = {
    'enabled': True,
    'budget_warnings': True,
    'budget_exceeded': True,
    'debt_reminders': True,
    'savings_reminders': True,
    'monthly_summary': True,
    'goal_reminders': True,
    'subscription_reminders': True,
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def share_zenda_link(request):
    """Return platform-aware download URL with the user's referral code."""
    user = request.user
    if not user.referral_code:
        user.referral_code = user.generate_referral_code()
        user.save(update_fields=['referral_code'])
    frontend = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com').rstrip('/')
    url = f'{frontend}/download?ref={user.referral_code}'
    return Response({
        'referral_code': user.referral_code,
        'download_url': url,
        'invite_url': f'{frontend}/invite/{user.referral_code}',
        'ios_store_url': getattr(settings, 'APP_STORE_URL_IOS', '') or '',
        'android_store_url': getattr(settings, 'APP_STORE_URL_ANDROID', '') or '',
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def track_referral_event(request):
    """
    Public endpoint to record download-link clicks (and optional install opens).
    Body: { referral_code, event_type: click|install, platform?: ios|android|web }
    """
    from .models import AppReferralEvent

    code = (request.data.get('referral_code') or '').strip().upper()
    event_type = (request.data.get('event_type') or AppReferralEvent.EVENT_CLICK).strip().lower()
    platform = (request.data.get('platform') or 'unknown').strip().lower()[:20]
    if not code:
        return Response({'error': 'referral_code required'}, status=status.HTTP_400_BAD_REQUEST)
    if event_type not in (
        AppReferralEvent.EVENT_CLICK,
        AppReferralEvent.EVENT_INSTALL,
        AppReferralEvent.EVENT_REGISTER,
    ):
        return Response({'error': 'invalid event_type'}, status=status.HTTP_400_BAD_REQUEST)

    referrer = User.objects.filter(referral_code__iexact=code).first()
    AppReferralEvent.objects.create(
        referral_code=code,
        referrer=referrer,
        event_type=event_type,
        platform=platform,
        user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:500],
        ip_address=request.META.get('REMOTE_ADDR'),
        metadata={'path': request.data.get('path') or ''},
    )
    return Response({'ok': True, 'referral_code': code, 'event_type': event_type})
