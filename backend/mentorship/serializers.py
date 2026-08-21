from rest_framework import serializers
from .models import (
    MentorshipPackage, MentorshipRequest, MentorshipPaymentProof,
    MentorAvailability, MentorshipSession,
)


class MentorshipPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MentorshipPackage
        fields = [
            'id', 'title', 'description', 'duration_minutes', 'sessions',
            'price', 'currency', 'is_active', 'offering_type', 'status', 'language',
            'programme_outline', 'mentor', 'is_featured', 'created_at'
        ]
        read_only_fields = ['status']


class MentorshipRequestSerializer(serializers.ModelSerializer):
    package = MentorshipPackageSerializer(read_only=True)
    user = serializers.SerializerMethodField()
    payment_proof = serializers.SerializerMethodField()

    class Meta:
        model = MentorshipRequest
        fields = [
            'id', 'user', 'package', 'objective', 'availability', 'contact',
            'status', 'notes', 'created_at', 'updated_at', 'payment_proof'
        ]
        read_only_fields = ['status', 'notes', 'updated_at']
    
    def get_user(self, obj):
        from accounts.serializers import UserSerializer
        return UserSerializer(obj.user).data

    def get_payment_proof(self, obj):
        try:
            proof = obj.payment_proof
            request = self.context.get('request')
            file_url = None
            if proof.file and request:
                file_url = request.build_absolute_uri(proof.file.url)
            elif proof.file:
                file_url = proof.file.url
            
            return {
                'id': proof.id,
                'status': proof.status,
                'file': proof.file.url if proof.file else None,
                'file_url': file_url,
                'created_at': proof.created_at,
                'reviewed_at': proof.reviewed_at
            }
        except MentorshipPaymentProof.DoesNotExist:
            return None


class MentorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = MentorAvailability
        fields = ['id', 'weekday', 'start_time', 'end_time', 'is_active']


class MentorshipSessionSerializer(serializers.ModelSerializer):
    mentor_name = serializers.SerializerMethodField()

    class Meta:
        model = MentorshipSession
        fields = [
            'id', 'mentor', 'package', 'request', 'starts_at', 'ends_at',
            'duration_minutes', 'status', 'meeting_provider', 'meeting_url',
            'notes', 'mentor_name', 'created_at',
        ]
        extra_kwargs = {
            'ends_at': {'required': False},
            'package': {'required': False},
            'request': {'required': False},
            'meeting_provider': {'required': False},
            'notes': {'required': False},
            'meeting_url': {'required': False},
        }

    def get_mentor_name(self, obj):
        return obj.mentor.user.get_full_name() or obj.mentor.user.email


class MentorshipPaymentProofSerializer(serializers.ModelSerializer):
    request = MentorshipRequestSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MentorshipPaymentProof
        fields = ['id', 'request', 'file', 'file_url', 'notes', 'status', 'created_at', 'reviewed_at']
        read_only_fields = ['status', 'reviewed_at', 'file_url']

    def get_file_url(self, obj):
        """Retorna a URL completa do arquivo"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
