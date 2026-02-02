from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal


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


from .models import (
    Category, PersonalExpense, Budget, Goal, Debt,
    Sale, BusinessExpense
)
from .serializers import (
    CategorySerializer, PersonalExpenseSerializer, BudgetSerializer,
    GoalSerializer, DebtSerializer, SaleSerializer, BusinessExpenseSerializer
)


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorias - permite criar, editar e deletar"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Category.objects.all()
        is_personal = self.request.query_params.get('is_personal', None)
        is_business = self.request.query_params.get('is_business', None)
        
        if is_personal == 'true':
            queryset = queryset.filter(is_personal=True)
        if is_business == 'true':
            queryset = queryset.filter(is_business=True)
        
        return queryset


# ==================== PERSONAL FINANCE ====================

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
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo das despesas. Params: period (daily|monthly|yearly|custom), month, year, date_from, date_to"""
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        start, end = get_period_dates(request)
        expenses = PersonalExpense.objects.filter(user=user, date__gte=start, date__lte=end)
        
        total = expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        by_category = expenses.values('category__name').annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'total': str(total),
            'by_category': list(by_category),
            'count': expenses.count(),
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
        
        if year:
            queryset = queryset.filter(year=year)

        # If month is provided (mobile uses it for the selected month),
        # include:
        # - monthly budgets for that month
        # - daily budgets within that month
        # - custom budgets that overlap that month
        # - yearly budgets for the selected year (regardless of month)
        if month and year:
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
        elif month:
            queryset = queryset.filter(month=month)
        
        return queryset.order_by('-year', '-month', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


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
        serializer.save(user=self.request.user)

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
            
            # Adicionar ao valor atual
            goal.current_amount += amount_decimal
            
            # Verificar se objetivo foi alcançado
            if goal.current_amount >= goal.target_amount:
                goal.status = 'completed'
                goal.current_amount = goal.target_amount  # Garantir que não ultrapasse
            
            goal.save()
            
            serializer = self.get_serializer(goal)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
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
        serializer.save(user=self.request.user)


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
        serializer.save(user=self.request.user)

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
        serializer.save(user=self.request.user)

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
