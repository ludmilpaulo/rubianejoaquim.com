from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login
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
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
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
    
    # Delete auth token to log out the user
    Token.objects.filter(user=user).delete()
    
    return Response({
        'message': 'Sua solicitação de exclusão de conta foi recebida. Sua conta e dados associados serão removidos em breve.',
        'account_deactivated': True
    }, status=status.HTTP_200_OK)
