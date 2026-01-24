from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'phone', 'address', 'referral_code', 'date_joined', 'is_staff', 'is_superuser', 'is_admin']
        read_only_fields = ['id', 'date_joined', 'is_staff', 'is_superuser', 'referral_code']
    
    def get_is_admin(self, obj):
        return obj.is_staff or obj.is_superuser


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de perfil do usuário"""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'address', 'email']
    
    def validate_email(self, value):
        """Verificar se o email não está em uso por outro usuário"""
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'first_name', 'last_name', 'phone']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("As palavras-passe não coincidem.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(help_text="Email ou username")
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email_or_username = attrs.get('email')
        password = attrs.get('password')

        if email_or_username and password:
            from .models import User
            user = None
            
            # First, try to authenticate directly (works if email_or_username is an email)
            # Since USERNAME_FIELD is 'email', authenticate expects email as username
            user = authenticate(username=email_or_username, password=password)
            
            # If that doesn't work, it might be a username - find user and authenticate with their email
            if not user:
                try:
                    # Check if it's a username
                    user_obj = User.objects.get(username=email_or_username)
                    # Authenticate using the user's email (which is the USERNAME_FIELD)
                    user = authenticate(username=user_obj.email, password=password)
                except User.DoesNotExist:
                    # Try as email (case-insensitive)
                    try:
                        user_obj = User.objects.get(email__iexact=email_or_username)
                        user = authenticate(username=user_obj.email, password=password)
                    except User.DoesNotExist:
                        pass
            
            if not user:
                raise serializers.ValidationError('Credenciais inválidas.')
            if not user.is_active:
                raise serializers.ValidationError('Conta desativada.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Email/username e palavra-passe são obrigatórios.')
        return attrs
