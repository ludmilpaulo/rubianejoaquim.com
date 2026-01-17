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
    payment_proof = serializers.SerializerMethodField()

    class Meta:
        model = MentorshipRequest
        fields = [
            'id', 'package', 'objective', 'availability', 'contact',
            'status', 'notes', 'created_at', 'updated_at', 'payment_proof'
        ]
        read_only_fields = ['status', 'notes', 'updated_at']

    def get_payment_proof(self, obj):
        try:
            proof = obj.payment_proof
            return {
                'id': proof.id,
                'status': proof.status,
                'created_at': proof.created_at,
                'reviewed_at': proof.reviewed_at
            }
        except MentorshipPaymentProof.DoesNotExist:
            return None


class MentorshipPaymentProofSerializer(serializers.ModelSerializer):
    request = MentorshipRequestSerializer(read_only=True)

    class Meta:
        model = MentorshipPaymentProof
        fields = ['id', 'request', 'file', 'notes', 'status', 'created_at', 'reviewed_at']
        read_only_fields = ['status', 'reviewed_at']
