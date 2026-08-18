from rest_framework import serializers

from wallet.models import Beneficiary, PaymentTransaction, Wallet, WalletAccount


class WalletAccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = WalletAccount
        fields = ['id', 'currency', 'balance', 'is_active']


class WalletSerializer(serializers.ModelSerializer):
    accounts = WalletAccountSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ['id', 'is_active', 'kyc_status', 'accounts', 'created_at']


class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'transaction_type', 'status', 'amount', 'currency', 'fee',
            'direction', 'provider', 'provider_reference', 'failure_reason',
            'created_at', 'completed_at',
        ]
        read_only_fields = fields


class TransferRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    transaction_type = serializers.ChoiceField(
        choices=['deposit', 'withdrawal', 'transfer', 'airtime', 'electricity', 'voucher']
    )
    beneficiary_id = serializers.IntegerField(required=False, allow_null=True)
    idempotency_key = serializers.CharField(max_length=64)
    simulate = serializers.CharField(required=False, allow_blank=True)


class BeneficiarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Beneficiary
        fields = ['id', 'name', 'country', 'currency', 'account_reference', 'provider', 'created_at']
        read_only_fields = ['id', 'created_at']
