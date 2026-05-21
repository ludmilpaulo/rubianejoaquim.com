import secrets
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from .models import FinanceSpace, FinanceSpaceMember, SharedGoal, SharedBudget, SharedContribution
from .serializers import (
    FinanceSpaceSerializer,
    SharedGoalSerializer,
    SharedBudgetSerializer,
    SharedContributionSerializer,
)


def _user_spaces(user):
    return FinanceSpace.objects.filter(
        Q(owner=user) | Q(members__user=user)
    ).distinct()


class FinanceSpaceViewSet(viewsets.ModelViewSet):
    serializer_class = FinanceSpaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _user_spaces(self.request.user)

    def perform_create(self, serializer):
        code = secrets.token_hex(4).upper()[:8]
        space = serializer.save(owner=self.request.user, invite_code=code)
        FinanceSpaceMember.objects.create(space=space, user=self.request.user, role='owner')

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        code = (request.data.get('invite_code') or '').strip().upper()
        if not code:
            return Response({'error': 'invite_code required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            space = FinanceSpace.objects.get(invite_code=code)
        except FinanceSpace.DoesNotExist:
            return Response({'error': 'Invalid invite code'}, status=status.HTTP_404_NOT_FOUND)
        FinanceSpaceMember.objects.get_or_create(
            space=space, user=request.user, defaults={'role': 'member'}
        )
        return Response(FinanceSpaceSerializer(space).data)


class SharedGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SharedGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SharedGoal.objects.filter(space__in=_user_spaces(self.request.user))

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SharedBudgetViewSet(viewsets.ModelViewSet):
    serializer_class = SharedBudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SharedBudget.objects.filter(space__in=_user_spaces(self.request.user))


class SharedContributionViewSet(viewsets.ModelViewSet):
    serializer_class = SharedContributionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SharedContribution.objects.filter(
            goal__space__in=_user_spaces(self.request.user)
        )

    def perform_create(self, serializer):
        contrib = serializer.save(user=self.request.user)
        goal = contrib.goal
        goal.current_amount += contrib.amount
        goal.save(update_fields=['current_amount'])
