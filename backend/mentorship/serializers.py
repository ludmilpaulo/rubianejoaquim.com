from rest_framework import serializers
from .models import MentorshipPackage, MentorshipRequest, MentorshipPaymentProof


class MentorshipPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MentorshipPackage
        fields = [
            'id', 'title', 'description', 'duration_minutes', 'sessions',
            'price', 'is_active', 'created_at'
        ]


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
