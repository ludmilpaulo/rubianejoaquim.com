import secrets
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from finance.fx import convert_amount
from tasks.models import Notification

from .models import (
    FinanceSpace,
    FinanceSpaceMember,
    SharedGoal,
    SharedBudget,
    SharedContribution,
    FamilyEntry,
    FamilyEntryShare,
    FamilySettlement,
    FamilyActivity,
)
from .permissions import HasSharedFinance, active_membership, can_view_entry
from .serializers import (
    FinanceSpaceSerializer,
    FinanceSpaceMemberSerializer,
    SharedGoalSerializer,
    SharedBudgetSerializer,
    SharedContributionSerializer,
    FamilyEntrySerializer,
    FamilySettlementSerializer,
    FamilyActivitySerializer,
)


def _new_invite_code() -> str:
    while True:
        code = ('F' + secrets.token_hex(4).upper())[:8]
        if not FinanceSpace.objects.filter(invite_code__iexact=code).exists():
            return code


def _user_spaces(user, include_pending=False):
    q = Q(owner=user) | Q(members__user=user, members__status='active')
    if include_pending:
        q = Q(owner=user) | Q(members__user=user)
    return FinanceSpace.objects.filter(q).distinct()


def _log(space, user, message: str):
    FamilyActivity.objects.create(space=space, user=user, message=message[:300])


def _notify(user, title, message, related_id=None):
    Notification.objects.create(
        user=user,
        title=title[:200],
        message=message,
        notification_type='system',
        related_object_type='finance_space',
        related_object_id=related_id,
    )


def _api_error(message, status_code):
    return Response({'error': message, 'detail': message}, status=status_code)


def _require_adult(user, space):
    membership = active_membership(user, space)
    if not membership or membership.role not in ('owner', 'adult'):
        raise PermissionDenied('Only owners and adult members can manage family budgets and goals.')
    return membership


def _budget_limit_in_space(budget, space):
    result = _apply_fx(budget.amount, budget.currency or space.currency, space.currency)
    if result is None:
        return budget.amount
    return result[0]


def _fx_timestamp(ts):
    if not ts:
        return None
    return ts if hasattr(ts, 'year') else parse_datetime(str(ts))


class FxUnavailable(APIException):
    status_code = 503
    default_detail = 'Exchange rates are temporarily unavailable.'
    default_code = 'fx_unavailable'


def _apply_fx(amount, from_ccy, to_ccy):
    fx = convert_amount(amount, from_ccy, to_ccy)
    if not fx:
        if (from_ccy or '').upper() == (to_ccy or '').upper():
            return Decimal(str(amount)), Decimal('1'), '', None
        return None
    ts = fx.get('provider_updated_at') or fx.get('updated_at')
    return fx['converted_amount'], fx['exchange_rate'], str(fx.get('source') or ''), ts


def _require_fx(amount, from_ccy, to_ccy):
    result = _apply_fx(amount, from_ccy, to_ccy)
    if result is None:
        raise FxUnavailable()
    return result


class FinanceSpaceViewSet(viewsets.ModelViewSet):
    serializer_class = FinanceSpaceSerializer
    permission_classes = [HasSharedFinance]

    def get_permissions(self):
        if self.action == 'preview':
            return [AllowAny()]
        return [HasSharedFinance()]

    def get_queryset(self):
        return _user_spaces(self.request.user, include_pending=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        code = _new_invite_code()
        space = serializer.save(
            owner=self.request.user,
            invite_code=code,
            invite_expires_at=timezone.now() + timedelta(days=30),
        )
        FinanceSpaceMember.objects.create(
            space=space, user=self.request.user, role='owner', status='active'
        )
        _log(space, self.request.user, f'{space.name} created')

    @action(
        detail=False,
        methods=['get'],
        url_path='preview',
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def preview(self, request):
        code = (request.query_params.get('invite_code') or '').strip().upper()
        if not code:
            return _api_error('invite_code required', status.HTTP_400_BAD_REQUEST)
        space = FinanceSpace.objects.filter(invite_code__iexact=code).first()
        if not space:
            return _api_error('Invalid invite code', status.HTTP_404_NOT_FOUND)
        if space.invite_expires_at and space.invite_expires_at < timezone.now():
            return _api_error('This invitation is invalid or has expired.', status.HTTP_410_GONE)
        return Response({
            'id': space.id,
            'name': space.name,
            'currency': space.currency,
            'member_count': space.members.filter(status='active').count(),
            'require_approval': space.require_approval,
        })

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        code = (request.data.get('invite_code') or '').strip().upper()
        if not code:
            return _api_error('invite_code required', status.HTTP_400_BAD_REQUEST)
        space = FinanceSpace.objects.filter(invite_code__iexact=code).first()
        if not space:
            return _api_error('Invalid invite code', status.HTTP_404_NOT_FOUND)
        if space.invite_expires_at and space.invite_expires_at < timezone.now():
            return _api_error('This invitation is invalid or has expired.', status.HTTP_410_GONE)

        existing = FinanceSpaceMember.objects.filter(space=space, user=request.user).first()
        if existing and existing.status == 'active':
            return Response(
                {'error': 'You are already a member of this family.', 'code': 'already_member',
                 **FinanceSpaceSerializer(space, context={'request': request}).data},
                status=status.HTTP_200_OK,
            )

        auto = not space.require_approval
        member, _created = FinanceSpaceMember.objects.update_or_create(
            space=space,
            user=request.user,
            defaults={'role': 'adult', 'status': 'active' if auto else 'pending'},
        )
        if auto:
            _log(space, request.user, f'{request.user.email} joined {space.name}')
            _notify(space.owner, 'New family member', f'{request.user.email} joined {space.name}.', space.id)
            return Response(FinanceSpaceSerializer(space, context={'request': request}).data)
        _notify(
            space.owner,
            'New family member request',
            f'{request.user.email} wants to join {space.name}.',
            space.id,
        )
        return Response({
            'status': 'pending',
            'space': {'id': space.id, 'name': space.name, 'currency': space.currency},
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        space = self.get_object()
        membership = active_membership(request.user, space)
        if not membership or membership.role != 'owner':
            return Response({'error': 'Only the owner can approve.'}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get('user_id')
        target = FinanceSpaceMember.objects.filter(space=space, user_id=user_id, status='pending').first()
        if not target:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)
        decision = request.data.get('decision', 'approve')
        if decision == 'decline':
            target.status = 'declined'
            target.save(update_fields=['status'])
            _notify(target.user, 'Family request declined', f'Your request to join {space.name} was declined.')
            return Response({'status': 'declined'})
        target.status = 'active'
        target.save(update_fields=['status'])
        _log(space, target.user, f'{target.user.email} joined {space.name}')
        _notify(target.user, 'Family request approved', f'You joined {space.name}.', space.id)
        return Response(FinanceSpaceMemberSerializer(target).data)

    @action(detail=True, methods=['post'], url_path='regenerate-code')
    def regenerate_code(self, request, pk=None):
        space = self.get_object()
        membership = active_membership(request.user, space)
        if not membership or membership.role != 'owner':
            return Response({'error': 'Only the owner can regenerate the code.'}, status=status.HTTP_403_FORBIDDEN)
        space.invite_code = _new_invite_code()
        space.invite_expires_at = timezone.now() + timedelta(days=30)
        space.save(update_fields=['invite_code', 'invite_expires_at'])
        return Response(FinanceSpaceSerializer(space, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='set-role')
    def set_role(self, request, pk=None):
        space = self.get_object()
        membership = active_membership(request.user, space)
        if not membership or membership.role != 'owner':
            return Response({'error': 'Only the owner can change roles.'}, status=status.HTTP_403_FORBIDDEN)
        role = request.data.get('role')
        if role not in ('owner', 'adult', 'child', 'viewer'):
            return Response({'error': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        member_id = request.data.get('member_id')
        target = FinanceSpaceMember.objects.filter(space=space, pk=member_id).first()
        if not target:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if role == 'owner':
            space.owner = target.user
            space.save(update_fields=['owner'])
            membership.role = 'adult'
            membership.save(update_fields=['role'])
        target.role = role
        target.save(update_fields=['role'])
        return Response(FinanceSpaceMemberSerializer(target).data)

    @action(detail=True, methods=['post'], url_path='remove-member')
    def remove_member(self, request, pk=None):
        space = self.get_object()
        membership = active_membership(request.user, space)
        if not membership or membership.role != 'owner':
            return Response({'error': 'Only the owner can remove members.'}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get('user_id')
        target = FinanceSpaceMember.objects.filter(space=space, user_id=user_id).first()
        if not target:
            return Response({'error': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target.role == 'owner':
            return Response({'error': 'Transfer ownership before removing the owner.'}, status=status.HTTP_400_BAD_REQUEST)
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='revoke-invite')
    def revoke_invite(self, request, pk=None):
        space = self.get_object()
        membership = active_membership(request.user, space)
        if not membership or membership.role != 'owner':
            return Response({'error': 'Only the owner can revoke the invite.'}, status=status.HTTP_403_FORBIDDEN)
        space.invite_expires_at = timezone.now()
        space.save(update_fields=['invite_expires_at'])
        return Response(FinanceSpaceSerializer(space, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='leave')
    def leave(self, request, pk=None):
        space = self.get_object()
        membership = FinanceSpaceMember.objects.filter(space=space, user=request.user).first()
        if not membership:
            return Response({'error': 'Not a member.'}, status=status.HTTP_400_BAD_REQUEST)
        if membership.role == 'owner':
            others = space.members.filter(status='active').exclude(user=request.user)
            if others.exists():
                return Response(
                    {'error': 'Transfer ownership or delete the family before leaving.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            space.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='dashboard')
    def dashboard(self, request, pk=None):
        space = self.get_object()
        if not active_membership(request.user, space):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        entries = [e for e in space.entries.all() if can_view_entry(request.user, e)]
        income = sum((e.converted_amount or e.amount) for e in entries if e.kind == 'income')
        expenses = sum((e.converted_amount or e.amount) for e in entries if e.kind == 'expense')
        savings = sum((e.converted_amount or e.amount) for e in entries if e.kind == 'contribution')
        debts = sum((e.converted_amount or e.amount) for e in entries if e.kind == 'debt')
        paid = sum((e.converted_amount or e.amount) for e in entries if e.kind == 'payment')
        budgets = list(space.shared_budgets.all())
        budget_amount = sum((_budget_limit_in_space(b, space) for b in budgets), Decimal('0'))
        budget_spent = sum((b.spent for b in budgets), Decimal('0'))
        remaining = budget_amount - budget_spent
        goals = list(space.shared_goals.all())
        upcoming = [
            FamilyEntrySerializer(e).data
            for e in entries
            if e.due_date and e.due_date >= date.today() and e.kind in ('bill', 'debt', 'payment')
        ][:8]
        return Response({
            'currency': space.currency,
            'income': str(income),
            'expenses': str(expenses),
            'balance': str(income - expenses),
            'savings': str(savings),
            'debts': str(max(debts - paid, Decimal('0'))),
            'budget_amount': str(budget_amount),
            'budget_spent': str(budget_spent),
            'budget_remaining': str(remaining),
            'budget_pct': float((budget_spent / budget_amount) * 100) if budget_amount else 0,
            'goals_active': len(goals),
            'goals': SharedGoalSerializer(goals, many=True).data,
            'budgets': SharedBudgetSerializer(budgets, many=True).data,
            'upcoming': upcoming,
            'activity': FamilyActivitySerializer(space.activities.all()[:20], many=True).data,
            'members': FinanceSpaceMemberSerializer(space.members.filter(status='active'), many=True).data,
            'pending': FinanceSpaceMemberSerializer(space.members.filter(status='pending'), many=True).data,
        })

    @action(detail=True, methods=['get', 'post'], url_path='settle')
    def settle(self, request, pk=None):
        space = self.get_object()
        membership = active_membership(request.user, space)
        if not membership:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        if request.method == 'GET':
            balances = defaultdict(lambda: Decimal('0'))
            for entry in space.entries.filter(kind='expense', visibility='family'):
                payer = entry.paid_by_id or entry.user_id
                total = entry.converted_amount or entry.amount
                shares = list(entry.shares.all())
                if not shares:
                    continue
                balances[payer] += total
                for share in shares:
                    balances[share.user_id] -= share.share_amount
            members = list(space.members.filter(status='active'))
            names = {
                m.user_id: (
                    f'{(m.user.first_name or "")} {(m.user.last_name or "")}'.strip()
                    or m.user.email
                )
                for m in members
            }
            ids = [m.user_id for m in members]
            net = {uid: balances[uid] for uid in ids}
            suggestions = []
            debtors = sorted([(u, -a) for u, a in net.items() if a < 0], key=lambda x: x[1], reverse=True)
            creditors = sorted([(u, a) for u, a in net.items() if a > 0], key=lambda x: x[1], reverse=True)
            i = j = 0
            while i < len(debtors) and j < len(creditors):
                du, da = debtors[i]
                cu, ca = creditors[j]
                pay = min(da, ca)
                if pay > 0:
                    suggestions.append({
                        'from_user': du,
                        'from_name': names.get(du, str(du)),
                        'to_user': cu,
                        'to_name': names.get(cu, str(cu)),
                        'amount': str(pay.quantize(Decimal('0.01'))),
                        'currency': space.currency,
                    })
                da -= pay
                ca -= pay
                debtors[i] = (du, da)
                creditors[j] = (cu, ca)
                if da <= 0:
                    i += 1
                if ca <= 0:
                    j += 1
            return Response({'suggestions': suggestions, 'currency': space.currency})

        payload = dict(request.data)
        payload['space'] = space.id
        ser = FamilySettlementSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        settlement = ser.save(space=space)
        if settlement.status == 'paid':
            settlement.paid_at = timezone.now()
            settlement.save(update_fields=['paid_at'])
            FamilyEntry.objects.create(
                space=space,
                user=request.user,
                kind='settlement',
                title='Settlement',
                amount=settlement.amount,
                currency=settlement.currency,
                converted_amount=settlement.amount,
                visibility='family',
                paid_by=settlement.from_user,
                date=date.today(),
            )
            _log(space, request.user, 'Settlement recorded')
        return Response(FamilySettlementSerializer(settlement).data, status=status.HTTP_201_CREATED)


class SharedGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SharedGoalSerializer
    permission_classes = [HasSharedFinance]

    def get_queryset(self):
        return SharedGoal.objects.filter(space__in=_user_spaces(self.request.user))

    def perform_create(self, serializer):
        space = serializer.validated_data.get('space')
        if space:
            _require_adult(self.request.user, space)
        serializer.save(created_by=self.request.user)
        if space:
            _log(space, self.request.user, f'Goal: {serializer.instance.title}')

    def perform_update(self, serializer):
        _require_adult(self.request.user, serializer.instance.space)
        serializer.save()

    def perform_destroy(self, instance):
        _require_adult(self.request.user, instance.space)
        instance.delete()


class SharedBudgetViewSet(viewsets.ModelViewSet):
    serializer_class = SharedBudgetSerializer
    permission_classes = [HasSharedFinance]

    def get_queryset(self):
        return SharedBudget.objects.filter(space__in=_user_spaces(self.request.user))

    def perform_create(self, serializer):
        space = serializer.validated_data.get('space')
        if space:
            _require_adult(self.request.user, space)
        serializer.save()

    def perform_update(self, serializer):
        _require_adult(self.request.user, serializer.instance.space)
        serializer.save()

    def perform_destroy(self, instance):
        _require_adult(self.request.user, instance.space)
        instance.delete()


class SharedContributionViewSet(viewsets.ModelViewSet):
    serializer_class = SharedContributionSerializer
    permission_classes = [HasSharedFinance]

    def get_queryset(self):
        return SharedContribution.objects.filter(
            goal__space__in=_user_spaces(self.request.user)
        )

    def perform_create(self, serializer):
        contrib = serializer.save(user=self.request.user)
        goal = contrib.goal
        converted, rate, source, _ts = _require_fx(
            contrib.amount, contrib.currency or goal.currency or 'AOA', goal.currency or 'AOA'
        )
        contrib.converted_amount = converted
        contrib.exchange_rate = rate
        contrib.exchange_rate_source = source
        contrib.save(update_fields=['converted_amount', 'exchange_rate', 'exchange_rate_source'])
        goal.current_amount += converted
        goal.save(update_fields=['current_amount'])
        _log(goal.space, self.request.user, f'Contributed to {goal.title}')


class FamilyEntryViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyEntrySerializer
    permission_classes = [HasSharedFinance]

    def get_queryset(self):
        qs = FamilyEntry.objects.filter(space__in=_user_spaces(self.request.user))
        space_id = self.request.query_params.get('space')
        if space_id:
            qs = qs.filter(space_id=space_id)
        user = self.request.user
        visible_ids = [e.id for e in qs if can_view_entry(user, e)]
        return FamilyEntry.objects.filter(id__in=visible_ids)

    def perform_create(self, serializer):
        space = serializer.validated_data.get('space')
        membership = active_membership(self.request.user, space) if space else None
        if not membership or membership.role in ('viewer',):
            raise PermissionDenied('You cannot add family transactions.')
        if membership.role == 'child' and serializer.validated_data.get('kind') not in (
            'expense', 'contribution',
        ):
            raise PermissionDenied('Restricted role.')
        amount = serializer.validated_data['amount']
        currency = serializer.validated_data.get('currency') or space.currency
        converted, rate, source, ts = _require_fx(amount, currency, space.currency)
        entry = serializer.save(
            user=self.request.user,
            currency=currency,
            converted_amount=converted,
            exchange_rate=rate,
            exchange_rate_source=source,
            exchange_rate_timestamp=_fx_timestamp(ts),
            paid_by=serializer.validated_data.get('paid_by') or self.request.user,
        )
        raw_shares = self.request.data.get('shares') or []
        if isinstance(raw_shares, list) and raw_shares:
            for share in raw_shares:
                FamilyEntryShare.objects.create(
                    entry=entry,
                    user_id=share.get('user'),
                    share_amount=Decimal(str(share.get('share_amount') or 0)),
                )
        _log(space, self.request.user, f'{entry.kind}: {entry.title}')
        self._maybe_budget_alerts(space, entry)

    def perform_update(self, serializer):
        entry = self.get_object()
        space = entry.space
        membership = active_membership(self.request.user, space)
        if not membership or membership.role == 'viewer':
            raise PermissionDenied('You cannot edit family transactions.')
        if membership.role != 'owner' and entry.user_id != self.request.user.id:
            raise PermissionDenied('You can only edit your own entries.')
        amount = serializer.validated_data.get('amount', entry.amount)
        currency = serializer.validated_data.get('currency', entry.currency) or space.currency
        converted, rate, source, ts = _require_fx(amount, currency, space.currency)
        serializer.save(
            amount=amount,
            currency=currency,
            converted_amount=converted,
            exchange_rate=rate,
            exchange_rate_source=source,
            exchange_rate_timestamp=_fx_timestamp(ts),
        )

    def _maybe_budget_alerts(self, space, entry):
        if entry.kind != 'expense':
            return
        now = timezone.now()
        budgets = space.shared_budgets.filter(month=now.month, year=now.year)
        for budget in budgets:
            prev_spent = budget.spent
            spent = FamilyEntry.objects.filter(
                space=space, kind='expense', date__month=now.month, date__year=now.year,
            ).aggregate(s=Sum('converted_amount'))['s'] or Decimal('0')
            budget.spent = spent
            budget.save(update_fields=['spent'])
            limit = _budget_limit_in_space(budget, space)
            if limit <= 0:
                continue
            pct = float(spent / limit) * 100
            prev_pct = float(prev_spent / limit) * 100
            owners = space.members.filter(status='active', role__in=('owner', 'adult'))
            msg = None
            title = 'Family budget'
            if prev_pct < 100 <= pct:
                title = 'Family budget reached'
                msg = 'Family spending has exceeded the monthly budget.'
            elif prev_pct < 90 <= pct:
                msg = f'Family budget warning: {pct:.0f}% used.'
            elif prev_pct < 80 <= pct:
                msg = f'Family budget warning: {pct:.0f}% used.'
            elif prev_pct < 70 <= pct:
                msg = f'Family budget warning: {pct:.0f}% used.'
            if msg:
                for m in owners:
                    _notify(m.user, title, msg, space.id)
