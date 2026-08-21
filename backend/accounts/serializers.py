from rest_framework import serializers
from django.contrib.auth import authenticate
from .currency_defaults import default_currency_for_region, normalize_currency
from .models import User


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.SerializerMethodField()
    is_instructor = serializers.SerializerMethodField()
    is_mentor = serializers.SerializerMethodField()
    is_tutor = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'phone', 'address',
            'referral_code', 'preferred_locale', 'preferred_currency', 'country', 'onboarding_completed',
            'onboarding_goals', 'finance_level', 'email_verified', 'profile_image_url',
            'dark_mode', 'notification_prefs', 'date_joined', 'is_staff', 'is_superuser', 'is_admin',
            'is_instructor', 'is_mentor', 'is_tutor',
        ]
        read_only_fields = [
            'id', 'date_joined', 'is_staff', 'is_superuser', 'referral_code',
            'email_verified', 'profile_image_url',
        ]
    
    def get_is_admin(self, obj):
        return obj.is_staff or obj.is_superuser

    def get_is_instructor(self, obj):
        profile = getattr(obj, 'instructor_profile', None)
        return bool(profile and profile.is_approved)

    def get_is_mentor(self, obj):
        profile = getattr(obj, 'mentor_profile', None)
        return bool(profile and profile.is_approved)

    def get_is_tutor(self, obj):
        profile = getattr(obj, 'tutor_profile', None)
        return bool(profile and profile.is_approved)


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de perfil do usuário"""
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone', 'address', 'email',
            'preferred_locale', 'preferred_currency', 'country', 'onboarding_completed', 'dark_mode',
            'onboarding_goals', 'finance_level', 'notification_prefs',
        ]
    
    def validate_email(self, value):
        """Verificar se o email não está em uso por outro usuário"""
        user = self.instance
        if User.objects.filter(email=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Este email já está em uso.")
        return value

    def validate_preferred_currency(self, value):
        return normalize_currency(value)

    def validate_preferred_locale(self, value):
        """Allow blank (device language) or pt/en/fr/es."""
        if value is None or value == '':
            return ''
        code = str(value).lower().strip()
        if code in ('pt', 'en', 'fr', 'es'):
            return code
        raise serializers.ValidationError('Unsupported locale. Use pt, en, fr, es, or blank.')

    def validate_country(self, value):
        if not value:
            return ''
        code = str(value).strip().upper()
        if len(code) != 2 or not code.isalpha():
            raise serializers.ValidationError('Use a 2-letter country code.')
        return code


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    preferred_currency = serializers.CharField(max_length=3, required=False, allow_blank=True)
    preferred_locale = serializers.CharField(max_length=5, required=False, allow_blank=True)
    device_region = serializers.CharField(max_length=2, required=False, allow_blank=True, write_only=True)
    country = serializers.CharField(max_length=2, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone',
            'preferred_currency', 'preferred_locale', 'device_region', 'country',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("As palavras-passe não coincidem.")
        return attrs

    def validate_preferred_currency(self, value):
        if not value:
            return value
        return normalize_currency(value)

    def validate_preferred_locale(self, value):
        if value is None or value == '':
            return ''
        code = str(value).lower().strip()
        if code in ('pt', 'en', 'fr', 'es'):
            return code
        raise serializers.ValidationError('Unsupported locale.')

    def validate_country(self, value):
        if not value:
            return ''
        code = str(value).strip().upper()
        if len(code) != 2 or not code.isalpha():
            raise serializers.ValidationError('Use a 2-letter country code.')
        return code

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        device_region = (validated_data.pop('device_region', None) or '').strip().upper() or None
        preferred = (validated_data.pop('preferred_currency', None) or '').strip() or None
        country = (validated_data.pop('country', None) or '').strip().upper() or None
        if preferred:
            validated_data['preferred_currency'] = normalize_currency(preferred)
        else:
            validated_data['preferred_currency'] = default_currency_for_region(device_region)
        if country:
            validated_data['country'] = country[:2]
        elif device_region:
            validated_data['country'] = device_region[:2]
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
            user_exists = False
            
            # Check if user exists first
            try:
                user_obj = User.objects.get(username=email_or_username)
                user_exists = True
                # Authenticate using the user's email (which is the USERNAME_FIELD)
                user = authenticate(username=user_obj.email, password=password)
            except User.DoesNotExist:
                # Try as email (case-insensitive)
                try:
                    user_obj = User.objects.get(email__iexact=email_or_username)
                    user_exists = True
                    user = authenticate(username=user_obj.email, password=password)
                except User.DoesNotExist:
                    # User doesn't exist
                    user_exists = False
            
            # If user doesn't exist, raise specific error
            if not user_exists:
                raise serializers.ValidationError({
                    'email': ['Utilizador não encontrado. Verifique o email ou username.']
                })
            
            # If user exists but password is wrong
            if user_exists and not user:
                raise serializers.ValidationError({
                    'password': ['Palavra-passe incorreta. Tente novamente.']
                })
            
            if not user.is_active:
                raise serializers.ValidationError('Conta desativada.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Email/username e palavra-passe são obrigatórios.')
        return attrs
