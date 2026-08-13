from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'facts', 'proposed_action', 'created_at']
        read_only_fields = ['id', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'user', 'created_at', 'updated_at', 'messages', 'message_count']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()


class ConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'title', 'created_at', 'updated_at', 'message_count', 'last_message_preview']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message_preview(self, obj):
        last_message = obj.messages.order_by('created_at').last()
        if last_message:
            return last_message.content[:100] + '...' if len(last_message.content) > 100 else last_message.content
        return None


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(required=True, allow_blank=False, max_length=2000)
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    locale = serializers.ChoiceField(choices=['pt', 'en', 'fr', 'es'], required=False, allow_null=True)


class ConfirmActionSerializer(serializers.Serializer):
    conversation_id = serializers.IntegerField()
    action_id = serializers.CharField()
    confirm = serializers.BooleanField()
    locale = serializers.ChoiceField(choices=['pt', 'en', 'fr', 'es'], required=False, allow_null=True)
