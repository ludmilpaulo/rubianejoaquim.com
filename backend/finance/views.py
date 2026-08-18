import logging
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Sum, Q, Count
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _user_currency(user) -> str:
    """Preferred currency for new records — original amount currency, not display FX."""
    code = getattr(user, 'preferred_currency', None) or 'AOA'
    return str(code).upper()[:3]


def _fx_timestamp(fx: dict | None):
    """Parse provider quote time from convert_amount() — never use 'now' as the rate time."""
    if not fx:
        return None
    raw = fx.get('provider_updated_at') or fx.get('updated_at')
    if not raw:
        return None
    if isinstance(raw, datetime):
        dt = raw
    else:
        from django.utils.dateparse import parse_datetime
        dt = parse_datetime(str(raw))
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt


def _fx_source(fx: dict | None) -> str:
    if not fx:
        return ''
    return str(fx.get('source') or '')[:64]


def save_with_user_currency(serializer, user, **extra):
    """Persist row with user + default currency when client omitted currency."""
    currency = serializer.validated_data.get('currency') or _user_currency(user)
    serializer.save(user=user, currency=currency, **extra)


def get_period_dates(request):
    """Parse period params: daily, monthly, yearly, custom. Returns (start_date, end_date). Default: current month."""
    period = request.query_params.get('period', 'monthly')
    now = timezone.now().date()
    if period == 'daily':
        return now, now
    if period == 'monthly':
        month = int(request.query_params.get('month', now.month))
        year = int(request.query_params.get('year', now.year))
        start = datetime(year, month, 1).date()
        if month == 12:
            end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end = datetime(year, month + 1, 1).date() - timedelta(days=1)
        return start, end
    if period == 'yearly':
        year = int(request.query_params.get('year', now.year))
        start = datetime(year, 1, 1).date()
        end = datetime(year, 12, 31).date()
        return start, end
    if period == 'custom':
        from_str = request.query_params.get('date_from')
        to_str = request.query_params.get('date_to')
        if from_str and to_str:
            start = datetime.strptime(from_str, '%Y-%m-%d').date()
            end = datetime.strptime(to_str, '%Y-%m-%d').date()
            return start, end
    # Default: current month
    start = datetime(now.year, now.month, 1).date()
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1).date() - timedelta(days=1)
    else:
        end = datetime(now.year, now.month + 1, 1).date() - timedelta(days=1)
    return start, end


from rest_framework.permissions import AllowAny

from .models import (
    Category, PersonalExpense, PersonalIncome, Budget, Goal, GoalContribution,
    Debt, DebtPayment,
    Sale, BusinessExpense, ExchangeRate, UserFavoriteCurrency, Receipt,
    MonthlyFinancialPlan,
)
from .serializers import (
    CategorySerializer, PersonalExpenseSerializer, PersonalIncomeSerializer,
    BudgetSerializer, GoalSerializer, DebtSerializer, SaleSerializer,
    BusinessExpenseSerializer, ExchangeRateSerializer, UserFavoriteCurrencySerializer,
    ReceiptSerializer, MonthlyFinancialPlanSerializer, ReceiptCreateExpenseSerializer,
)
from .services import (
    build_dashboard,
    compute_financial_health,
    get_health_history,
    build_analytics,
    process_receipt_ocr,
    create_expense_from_receipt,
    apply_expense_fx_snapshot,
    build_transaction_history,
)


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorias - sistema (user=null) + categorias pessoais do utilizador."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Category.objects.filter(
            Q(user__isnull=True) | Q(user=self.request.user)
        )
        is_personal = self.request.query_params.get('is_personal', None)
        is_business = self.request.query_params.get('is_business', None)

        if is_personal == 'true':
            queryset = queryset.filter(is_personal=True)
        if is_business == 'true':
            queryset = queryset.filter(is_business=True)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _ensure_can_modify(self, instance):
        user = self.request.user
        is_admin = user.is_staff or user.is_superuser
        if instance.user_id is None and not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Não pode alterar categorias de sistema.')
        if instance.user_id and instance.user_id != user.id and not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Não pode alterar categorias de outro utilizador.')

    def perform_update(self, serializer):
        self._ensure_can_modify(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_can_modify(instance)
        instance.delete()


# ==================== PERSONAL FINANCE ====================

class PersonalIncomeViewSet(viewsets.ModelViewSet):
    serializer_class = PersonalIncomeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PersonalIncome.objects.filter(user=self.request.user)
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month:
            queryset = queryset.filter(date__month=month)
        if year:
            queryset = queryset.filter(date__year=year)
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        user = request.user
        start, end = get_period_dates(request)
        incomes = PersonalIncome.objects.filter(user=user, date__gte=start, date__lte=end)
        preferred = _user_currency(user)
        from finance.fx import sum_in_currency, convert_amount

        rows = [(i.amount, i.currency or preferred) for i in incomes.only('amount', 'currency')]
        total = sum_in_currency(rows, preferred)
        by_source_map: dict[str, dict] = {}
        for inc in incomes.only('amount', 'currency', 'source_type'):
            key = inc.source_type or 'other'
            converted = convert_amount(inc.amount, inc.currency or preferred, preferred)
            amt = converted['converted_amount'] if converted else Decimal(str(inc.amount))
            entry = by_source_map.setdefault(key, {'source_type': key, 'total': Decimal('0'), 'count': 0})
            entry['total'] += amt
            entry['count'] += 1
        by_source = [
            {'source_type': v['source_type'], 'total': str(v['total'].quantize(Decimal('0.01'))), 'count': v['count']}
            for v in by_source_map.values()
        ]
        return Response({
            'total': str(total),
            'by_source': by_source,
            'count': incomes.count(),
            'currency': preferred,
            'period': {'start': str(start), 'end': str(end)},
        })


class PersonalExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet para despesas pessoais"""
    serializer_class = PersonalExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = PersonalExpense.objects.filter(user=user)
        
        # Filtros
        month = self.request.query_params.get('month', None)
        year = self.request.query_params.get('year', None)
        category = self.request.query_params.get('category', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from and date_to:
            start = datetime.strptime(date_from, '%Y-%m-%d').date()
            end = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(date__gte=start, date__lte=end)
        else:
            if month:
                queryset = queryset.filter(date__month=month)
            if year:
                queryset = queryset.filter(date__year=year)
        if category:
            queryset = queryset.filter(category_id=category)
        
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)
        expense = serializer.instance
        apply_expense_fx_snapshot(expense, self.request.user)
        alerts = []
        try:
            from finance.budget_alerts import maybe_emit_budget_alerts, maybe_emit_category_budget_alerts
            alerts = maybe_emit_budget_alerts(
                self.request.user,
                month=expense.date.month,
                year=expense.date.year,
            )
            if expense.budget_id:
                alerts.extend(maybe_emit_category_budget_alerts(self.request.user, expense.budget))
        except Exception:
            alerts = []
        self._budget_alerts = alerts

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        alerts = getattr(self, '_budget_alerts', []) or []
        if isinstance(response.data, dict) and alerts:
            response.data['budget_alerts'] = alerts
        return response

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo das despesas. Params: period (daily|monthly|yearly|custom), month, year, date_from, date_to"""
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        start, end = get_period_dates(request)
        expenses = PersonalExpense.objects.filter(user=user, date__gte=start, date__lte=end)
        
        preferred = _user_currency(user)
        from finance.fx import sum_in_currency, convert_amount

        rows = [(e.amount, e.currency or preferred) for e in expenses.only('amount', 'currency')]
        total = sum_in_currency(rows, preferred)
        by_cat_map: dict[str, dict] = {}
        for exp in expenses.select_related('category').only('amount', 'currency', 'category__name'):
            key = exp.category.name if exp.category else 'Other'
            converted = convert_amount(exp.amount, exp.currency or preferred, preferred)
            amt = converted['converted_amount'] if converted else Decimal(str(exp.amount))
            entry = by_cat_map.setdefault(key, {'category__name': key, 'total': Decimal('0'), 'count': 0})
            entry['total'] += amt
            entry['count'] += 1
        by_category = [
            {
                'category__name': v['category__name'],
                'total': str(v['total'].quantize(Decimal('0.01'))),
                'count': v['count'],
            }
            for v in by_cat_map.values()
        ]
        
        return Response({
            'total': str(total),
            'by_category': by_category,
            'count': expenses.count(),
            'currency': preferred,
            'period': {'start': str(start), 'end': str(end)},
        })


class BudgetViewSet(viewsets.ModelViewSet):
    """ViewSet para orçamentos"""
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Budget.objects.filter(user=user)
        
        month = self.request.query_params.get('month', None)
        year = self.request.query_params.get('year', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        # If date_from and date_to are provided (custom period), filter budgets that overlap
        if date_from and date_to:
            try:
                start = datetime.strptime(date_from, '%Y-%m-%d').date()
                end = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(
                    Q(period_type='daily', date__gte=start, date__lte=end) |
                    Q(period_type='monthly') & (
                      Q(year__lt=end.year) | Q(year=end.year, month__lte=end.month)
                    ) & (
                      Q(year__gt=start.year) | Q(year=start.year, month__gte=start.month)
                    ) |
                    Q(period_type='yearly', year__gte=start.year, year__lte=end.year) |
                    Q(period_type='custom', start_date__lte=end, end_date__gte=start)
                )
            except (ValueError, TypeError):
                pass
        
        if year:
            queryset = queryset.filter(year=year)

        # If month is provided (mobile uses it for the selected month),
        # include:
        # - monthly budgets for that month
        # - daily budgets within that month
        # - custom budgets that overlap that month
        # - yearly budgets for the selected year (regardless of month)
        if month and year and not (date_from and date_to):
            try:
                m = int(month)
                y = int(year)
                month_start = datetime(y, m, 1).date()
                # Compute month end
                if m == 12:
                    month_end = datetime(y + 1, 1, 1).date() - timedelta(days=1)
                else:
                    month_end = datetime(y, m + 1, 1).date() - timedelta(days=1)

                queryset = queryset.filter(
                    Q(period_type='monthly', month=m) |
                    Q(period_type='daily', date__year=y, date__month=m) |
                    Q(period_type='custom', start_date__lte=month_end, end_date__gte=month_start) |
                    Q(period_type='yearly')
                )
            except (ValueError, TypeError):
                # Fallback to old behavior if month/year are invalid
                queryset = queryset.filter(month=month)
        elif month and not (date_from and date_to):
            queryset = queryset.filter(month=month)
        
        return queryset.order_by('-year', '-month', '-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)

    @action(detail=True, methods=['get'])
    def expenses(self, request, pk=None):
        """Get expenses for this budget (filtered by category and date range)"""
        budget = self.get_object()
        user = request.user
        
        if budget.user != user:
            return Response(
                {'error': 'Não autorizado.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get expenses matching this budget's category and period
        expenses = PersonalExpense.objects.filter(user=user)
        
        # Filter by category
        if budget.category_id:
            expenses = expenses.filter(category=budget.category)
        else:
            expenses = expenses.filter(category__isnull=True)
        
        # Filter by period type
        period_type = getattr(budget, 'period_type', 'monthly')
        if period_type == 'daily':
            if budget.date:
                expenses = expenses.filter(date=budget.date)
        elif period_type == 'yearly':
            expenses = expenses.filter(date__year=budget.year)
        elif period_type == 'custom':
            if budget.start_date and budget.end_date:
                expenses = expenses.filter(date__range=(budget.start_date, budget.end_date))
        else:  # monthly
            expenses = expenses.filter(date__year=budget.year, date__month=budget.month)
        
        serializer = PersonalExpenseSerializer(expenses.order_by('-date', '-created_at'), many=True)
        return Response({
            'expenses': serializer.data,
            'budget': BudgetSerializer(budget).data,
        })


class GoalViewSet(viewsets.ModelViewSet):
    """ViewSet para objetivos"""
    serializer_class = GoalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status', None)
        
        queryset = Goal.objects.filter(user=user)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)

    @action(detail=True, methods=['post'], url_path='add-money')
    def add_money(self, request, pk=None):
        """Adicionar dinheiro a um objetivo"""
        goal = self.get_object()
        
        if goal.user != request.user:
            return Response(
                {'error': 'Não autorizado.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if goal.status != 'active':
            return Response(
                {'error': 'Apenas objetivos ativos podem receber dinheiro.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = request.data.get('amount')
        if not amount:
            return Response(
                {'error': 'Valor é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                return Response(
                    {'error': 'Valor deve ser maior que zero.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from finance.fx import convert_amount

            pay_currency = (
                str(request.data.get('currency') or goal.currency or _user_currency(request.user))
                .upper()[:3]
            )
            goal_currency = (goal.currency or 'AOA').upper()
            fx = convert_amount(amount_decimal, pay_currency, goal_currency)
            if not fx:
                if pay_currency != goal_currency:
                    return Response(
                        {
                            'error': 'Taxa de câmbio indisponível para esta conversão. Tente novamente.',
                            'code': 'fx_unavailable',
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                converted = amount_decimal
                rate = Decimal('1')
            else:
                converted = fx['converted_amount']
                rate = fx['exchange_rate']

            note = str(request.data.get('note', '') or '')[:255]
            previous_amount = goal.current_amount
            GoalContribution.objects.create(
                user=request.user,
                goal=goal,
                amount=amount_decimal,
                currency=pay_currency,
                exchange_rate=rate,
                converted_amount=converted,
                exchange_rate_source=_fx_source(fx),
                exchange_rate_timestamp=_fx_timestamp(fx),
                note=note,
            )

            goal.current_amount += converted

            if goal.current_amount >= goal.target_amount:
                goal.status = 'completed'
                goal.current_amount = goal.target_amount

            goal.save()
            from finance.goal_progress import notify_goal_progress
            progress_events = notify_goal_progress(goal, previous_amount)
            goal.refresh_from_db()

            serializer = self.get_serializer(goal)
            data = serializer.data
            data['progress_events'] = progress_events
            return Response(data, status=status.HTTP_200_OK)
            
        except (ValueError, TypeError):
            return Response(
                {'error': 'Valor inválido.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class DebtViewSet(viewsets.ModelViewSet):
    """ViewSet para dívidas"""
    serializer_class = DebtSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status', None)
        
        queryset = Debt.objects.filter(user=user)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.order_by('due_date', '-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        """Registar pagamento de dívida"""
        debt = self.get_object()
        if debt.user != request.user:
            return Response({'error': 'Não autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Valor é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_decimal = Decimal(str(amount))
            if amount_decimal <= 0:
                return Response(
                    {'error': 'Valor deve ser maior que zero.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payment_date = request.data.get('payment_date')
            if payment_date:
                from datetime import datetime as dt
                payment_date = dt.strptime(str(payment_date), '%Y-%m-%d').date()
            else:
                payment_date = timezone.now().date()

            from finance.fx import convert_amount

            pay_currency = (
                str(request.data.get('currency') or debt.currency or _user_currency(request.user))
                .upper()[:3]
            )
            if len(pay_currency) != 3 or not pay_currency.isalpha():
                return Response(
                    {'error': 'Moeda de pagamento inválida.', 'code': 'invalid_currency'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            debt_currency = (debt.currency or 'AOA').upper()
            fx = convert_amount(amount_decimal, pay_currency, debt_currency)
            if not fx:
                if pay_currency != debt_currency:
                    return Response(
                        {
                            'error': 'Taxa de câmbio indisponível para esta conversão. Tente novamente.',
                            'code': 'fx_unavailable',
                        },
                        status=status.HTTP_503_SERVICE_UNAVAILABLE,
                    )
                converted = amount_decimal
                rate = Decimal('1')
            else:
                converted = fx['converted_amount']
                rate = fx['exchange_rate']

            remaining = max(debt.total_amount - debt.paid_amount, Decimal('0'))
            if converted > remaining:
                return Response(
                    {
                        'error': 'O pagamento excede o valor em dívida.',
                        'code': 'overpay',
                        'remaining': str(remaining),
                        'debt_currency': debt_currency,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            note = str(request.data.get('note', '') or '')
            will_settle = (debt.paid_amount + converted) >= debt.total_amount
            DebtPayment.objects.create(
                debt=debt,
                amount=amount_decimal,
                currency=pay_currency,
                exchange_rate=rate,
                converted_amount=converted,
                exchange_rate_source=_fx_source(fx),
                exchange_rate_timestamp=_fx_timestamp(fx),
                status='paid' if will_settle else 'partial',
                payment_date=payment_date,
                note=note,
            )

            debt.paid_amount += converted
            if debt.paid_amount >= debt.total_amount:
                debt.paid_amount = debt.total_amount
                debt.status = 'paid'
            debt.save()

            serializer = self.get_serializer(debt)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except (ValueError, TypeError):
            return Response({'error': 'Valor inválido.'}, status=status.HTTP_400_BAD_REQUEST)


# ==================== BUSINESS FINANCE ====================

class SaleViewSet(viewsets.ModelViewSet):
    """ViewSet para vendas"""
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Sale.objects.filter(user=user)
        month = self.request.query_params.get('month', None)
        year = self.request.query_params.get('year', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from and date_to:
            start = datetime.strptime(date_from, '%Y-%m-%d').date()
            end = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(date__gte=start, date__lte=end)
        else:
            if month:
                queryset = queryset.filter(date__month=month)
            if year:
                queryset = queryset.filter(date__year=year)
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo das vendas. Params: period (daily|monthly|yearly|custom), month, year, date_from, date_to"""
        user = request.user
        start, end = get_period_dates(request)
        sales = Sale.objects.filter(user=user, date__gte=start, date__lte=end)
        total = sales.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        return Response({
            'total': str(total),
            'count': sales.count(),
            'period': {'start': str(start), 'end': str(end)},
        })


class BusinessExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet para despesas do negócio"""
    serializer_class = BusinessExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = BusinessExpense.objects.filter(user=user)
        
        month = self.request.query_params.get('month', None)
        year = self.request.query_params.get('year', None)
        category = self.request.query_params.get('category', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from and date_to:
            start = datetime.strptime(date_from, '%Y-%m-%d').date()
            end = datetime.strptime(date_to, '%Y-%m-%d').date()
            queryset = queryset.filter(date__gte=start, date__lte=end)
        else:
            if month:
                queryset = queryset.filter(date__month=month)
            if year:
                queryset = queryset.filter(date__year=year)
        if category:
            queryset = queryset.filter(category_id=category)
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        save_with_user_currency(serializer, self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo das despesas. Params: period (daily|monthly|yearly|custom), month, year, date_from, date_to"""
        user = request.user
        start, end = get_period_dates(request)
        expenses = BusinessExpense.objects.filter(user=user, date__gte=start, date__lte=end)
        total = expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        by_category = expenses.values('category__name').annotate(total=Sum('amount'), count=Count('id'))
        return Response({
            'total': str(total),
            'by_category': list(by_category),
            'count': expenses.count(),
            'period': {'start': str(start), 'end': str(end)},
        })


class BusinessMetricsViewSet(viewsets.ViewSet):
    """ViewSet para métricas do negócio"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Visão geral das finanças. Params: period (daily|monthly|yearly|custom), month, year, date_from, date_to"""
        user = request.user
        start, end = get_period_dates(request)
        sales = Sale.objects.filter(user=user, date__gte=start, date__lte=end)
        expenses = BusinessExpense.objects.filter(user=user, date__gte=start, date__lte=end)
        sales_total = sales.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        expenses_total = expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        profit = sales_total - expenses_total
        return Response({
            'sales': {'total': str(sales_total), 'count': sales.count()},
            'expenses': {'total': str(expenses_total), 'count': expenses.count()},
            'profit': {'total': str(profit), 'is_positive': profit >= 0},
            'period': {'start': str(start), 'end': str(end)},
        })


class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        return Response(build_dashboard(request.user))

    @action(detail=False, methods=['get'])
    def health_score(self, request):
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        return Response(
            compute_financial_health(
                request.user,
                int(month) if month else None,
                int(year) if year else None,
            )
        )

    @action(detail=False, methods=['get'], url_path='health-history')
    def health_history(self, request):
        months = int(request.query_params.get('months', 6))
        return Response({'history': get_health_history(request.user, months)})

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        return Response(build_analytics(request.user))


class ReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        return Receipt.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        receipt = serializer.save(user=self.request.user)
        process_receipt_ocr(receipt)

    @action(detail=True, methods=['post'], url_path='reprocess')
    def reprocess(self, request, pk=None):
        receipt = self.get_object()
        process_receipt_ocr(receipt)
        return Response(self.get_serializer(receipt).data)

    @action(detail=True, methods=['post'], url_path='create-expense')
    def create_expense(self, request, pk=None):
        receipt = self.get_object()
        ser = ReceiptCreateExpenseSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            expense, alerts = create_expense_from_receipt(
                receipt,
                category_id=data.get('category_id'),
                budget_id=data.get('budget_id'),
                description=data.get('description'),
                amount=data.get('amount'),
                currency=data.get('currency'),
                expense_date=data.get('date'),
                payment_method=data.get('payment_method'),
                confirmed_low_confidence=data.get('confirmed_low_confidence', False),
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        budget_impact = None
        if expense.budget_id:
            b = expense.budget
            budget_impact = {
                'budget_id': b.id,
                'budget_name': b.category.name if b.category else b.description,
                'limit': str(b.amount),
                'spent': str(b.spent),
                'remaining': str(b.remaining),
                'currency': b.currency,
            }

        return Response({
            'expense': PersonalExpenseSerializer(expense).data,
            'receipt': self.get_serializer(receipt).data,
            'budget_alerts': alerts,
            'budget_impact': budget_impact,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='file')
    def file(self, request, pk=None):
        from django.http import FileResponse, Http404
        from finance.receipt_storage import verify_receipt_access_token

        receipt = self.get_object()
        token = request.query_params.get('token')
        if token:
            if not verify_receipt_access_token(token, receipt.id, request.user.id):
                return Response({'detail': 'Invalid or expired token'}, status=status.HTTP_403_FORBIDDEN)
        elif receipt.user_id != request.user.id:
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        if not receipt.file:
            raise Http404
        try:
            return FileResponse(receipt.file.open('rb'), content_type='application/octet-stream')
        except FileNotFoundError:
            raise Http404


class TransactionHistoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        filters = {
            'date_from': request.query_params.get('date_from'),
            'date_to': request.query_params.get('date_to'),
            'month': request.query_params.get('month'),
            'year': request.query_params.get('year'),
            'category': request.query_params.get('category'),
            'budget': request.query_params.get('budget'),
            'currency': request.query_params.get('currency'),
            'merchant': request.query_params.get('merchant'),
            'payment_method': request.query_params.get('payment_method'),
            'amount_min': request.query_params.get('amount_min'),
            'amount_max': request.query_params.get('amount_max'),
        }
        rows = build_transaction_history(request.user, filters=filters)
        return Response({'results': rows, 'count': len(rows)})


class ExchangeRateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ExchangeRate.objects.all()
    serializer_class = ExchangeRateSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_throttles(self):
        from finance.throttling import FxAnonRateThrottle, FxUserRateThrottle
        if self.request.user and self.request.user.is_authenticated:
            return [FxUserRateThrottle()]
        return [FxAnonRateThrottle()]

    def list(self, request, *args, **kwargs):
        """Optionally refresh live rates when ?refresh=1. Always expose source/stale/freshness."""
        from finance.fx import get_fx_meta, refresh_exchange_rates

        try:
            force = request.query_params.get('refresh') in ('1', 'true', 'True')
            if not ExchangeRate.objects.exists():
                force = True
            result = refresh_exchange_rates(force=force)
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            meta = get_fx_meta(
                just_refreshed=bool(result.get('refreshed')),
                fetch_failed=bool(result.get('error')),
                refresh_error=result.get('error'),
            )
            return Response({'results': serializer.data, 'count': len(serializer.data), **meta})
        except Exception as exc:
            logger.exception('FX list failed')
            return Response(
                {
                    'results': [],
                    'count': 0,
                    'freshness': 'unavailable',
                    'stale': True,
                    'source': 'unavailable',
                    'refresh_error': str(exc),
                    'error': str(exc),
                }
            )

    @action(detail=False, methods=['get'])
    def supported(self, request):
        from accounts.currency_defaults import SUPPORTED_CURRENCIES
        from finance.fx import get_fx_meta, refresh_exchange_rates

        result = refresh_exchange_rates(force=False)
        return Response({
            'currencies': sorted(SUPPORTED_CURRENCIES),
            **get_fx_meta(
                just_refreshed=bool(result.get('refreshed')),
                fetch_failed=bool(result.get('error')),
                refresh_error=result.get('error'),
            ),
        })

    @action(detail=False, methods=['get'])
    def convert(self, request):
        """
        Convert amount using cached market rates.
        Returns original amount, converted amount, unit rate, source, timestamps, stale.
        Converted values are display-only — originals are never overwritten.
        """
        from finance.fx import convert_amount, get_fx_meta, refresh_exchange_rates

        try:
            force = request.query_params.get('refresh') in ('1', 'true', 'True')
            if not ExchangeRate.objects.exists():
                force = True
            refresh_result = refresh_exchange_rates(force=force)

            try:
                amount = Decimal(request.query_params.get('amount', '0'))
            except Exception:
                return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

            from_cur = request.query_params.get('from', 'USD').upper()
            to_cur = request.query_params.get('to', 'AOA').upper()

            fx = convert_amount(amount, from_cur, to_cur)
            fetch_failed = bool(refresh_result.get('error'))
            refresh_error = refresh_result.get('error')
            if not fx:
                meta = get_fx_meta(
                    stale_override=True,
                    fetch_failed=fetch_failed,
                    refresh_error=refresh_error,
                )
                error = 'Rate not found'
                if refresh_error:
                    error = f'Rate not found ({refresh_error})'
                return Response(
                    {
                        'error': error,
                        'from': from_cur,
                        'to': to_cur,
                        **meta,
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            payload = {
                'original_amount': str(Decimal(str(amount)).quantize(Decimal('0.01'))),
                'original_currency': from_cur,
                'converted_amount': str(fx['converted_amount']),
                'converted_currency': to_cur,
                'amount': str(fx['converted_amount']),
                'converted': str(fx['converted_amount']),
                'from': from_cur,
                'to': to_cur,
                'rate': str(fx['exchange_rate']),
                'exchange_rate': str(fx['exchange_rate']),
                'rate_timestamp': fx.get('provider_updated_at') or fx.get('updated_at'),
                'rate_line': f"1 {from_cur} = {fx['exchange_rate']} {to_cur}",
                'updated_at': fx.get('updated_at'),
                'provider_updated_at': fx.get('provider_updated_at'),
                'fetched_at': fx.get('fetched_at'),
                'last_successful_update': fx.get('fetched_at'),
                'source': fx.get('source'),
                'stale': bool(fx.get('stale')) or fetch_failed,
                'freshness': 'stale' if fetch_failed else fx.get('freshness'),
                'market_closed': bool(fx.get('market_closed')),
            }
            if refresh_error:
                payload['refresh_error'] = refresh_error
            return Response(payload)
        except Exception as exc:
            logger.exception('FX convert failed')
            return Response(
                {
                    'error': str(exc),
                    'from': request.query_params.get('from', '').upper(),
                    'to': request.query_params.get('to', '').upper(),
                    'freshness': 'unavailable',
                    'stale': True,
                    'refresh_error': str(exc),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class UserFavoriteCurrencyViewSet(viewsets.ModelViewSet):
    serializer_class = UserFavoriteCurrencySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserFavoriteCurrency.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MonthlyFinancialPlanViewSet(viewsets.ModelViewSet):
    """Salary / monthly spending plan with planned expense lines + live progress."""
    serializer_class = MonthlyFinancialPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MonthlyFinancialPlan.objects.filter(user=self.request.user).prefetch_related('items')

    def perform_create(self, serializer):
        currency = serializer.validated_data.get('currency') or _user_currency(self.request.user)
        serializer.save(user=self.request.user, currency=currency)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='current')
    def current(self, request):
        """Get or upsert plan for month/year (defaults to current calendar month)."""
        now = timezone.now().date()
        try:
            month = int(request.query_params.get('month', now.month))
            year = int(request.query_params.get('year', now.year))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid month/year'}, status=status.HTTP_400_BAD_REQUEST)

        plan = MonthlyFinancialPlan.objects.filter(
            user=request.user, month=month, year=year
        ).prefetch_related('items').first()

        if request.method == 'GET':
            from finance.budget_alerts import month_actual_expenses
            if not plan:
                return Response({
                    'id': None,
                    'month': month,
                    'year': year,
                    'salary': '0',
                    'spending_limit': '0',
                    'savings_target': '0',
                    'currency': _user_currency(request.user),
                    'notes': '',
                    'items': [],
                    'progress': {
                        'salary': '0',
                        'spending_limit': '0',
                        'savings_target': '0',
                        'planned_expenses': '0',
                        'planned_needs': '0',
                        'planned_wants': '0',
                        'planned_savings': '0',
                        'actual_expenses': str(month_actual_expenses(request.user, month, year)),
                        'actual_savings': '0',
                        'remaining': '0',
                        'percent_used': '0',
                        'status': 'ok',
                        'currency': _user_currency(request.user),
                        'month': month,
                        'year': year,
                    },
                    'last_budget_alert_level': 0,
                })
            return Response(self.get_serializer(plan).data)

        payload = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        payload['month'] = month
        payload['year'] = year
        if plan:
            serializer = self.get_serializer(plan, data=payload, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """Monthly financial dashboard for month/year."""
        from finance.budget_alerts import compute_plan_progress, month_actual_expenses

        now = timezone.now().date()
        try:
            month = int(request.query_params.get('month', now.month))
            year = int(request.query_params.get('year', now.year))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid month/year'}, status=status.HTTP_400_BAD_REQUEST)

        plan = MonthlyFinancialPlan.objects.filter(
            user=request.user, month=month, year=year
        ).prefetch_related('items').first()
        if plan:
            data = compute_plan_progress(plan)
            data['items'] = MonthlyFinancialPlanSerializer(plan).data.get('items', [])
            data['has_plan'] = True
            return Response(data)

        actual = month_actual_expenses(request.user, month, year)
        return Response({
            'has_plan': False,
            'month': month,
            'year': year,
            'salary': '0',
            'spending_limit': '0',
            'savings_target': '0',
            'planned_expenses': '0',
            'planned_needs': '0',
            'planned_wants': '0',
            'planned_savings': '0',
            'actual_expenses': str(actual),
            'actual_savings': '0',
            'remaining': '0',
            'percent_used': '0',
            'status': 'ok',
            'currency': _user_currency(request.user),
            'items': [],
        })
