from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

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
        """Resumo das despesas do mês atual"""
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        now = timezone.now()
        
        month_expenses = PersonalExpense.objects.filter(
            user=user,
            date__year=now.year,
            date__month=now.month
        )
        
        total = month_expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        by_category = month_expenses.values('category__name').annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'total': str(total),
            'by_category': list(by_category),
            'count': month_expenses.count()
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
        
        if month:
            queryset = queryset.filter(date__month=month)
        if year:
            queryset = queryset.filter(date__year=year)
        
        return queryset.order_by('-date', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumo das vendas"""
        user = request.user
        now = timezone.now()
        
        month_sales = Sale.objects.filter(
            user=user,
            date__year=now.year,
            date__month=now.month
        )
        
        total = month_sales.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        
        return Response({
            'total': str(total),
            'count': month_sales.count()
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
        """Resumo das despesas do mês atual"""
        user = request.user
        now = timezone.now()
        
        month_expenses = BusinessExpense.objects.filter(
            user=user,
            date__year=now.year,
            date__month=now.month
        )
        
        total = month_expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        by_category = month_expenses.values('category__name').annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'total': str(total),
            'by_category': list(by_category),
            'count': month_expenses.count()
        })


class BusinessMetricsViewSet(viewsets.ViewSet):
    """ViewSet para métricas do negócio"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Visão geral das finanças do negócio"""
        user = request.user
        now = timezone.now()
        
        # Vendas do mês
        month_sales = Sale.objects.filter(
            user=user,
            date__year=now.year,
            date__month=now.month
        )
        sales_total = month_sales.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        
        # Despesas do mês
        month_expenses = BusinessExpense.objects.filter(
            user=user,
            date__year=now.year,
            date__month=now.month
        )
        expenses_total = month_expenses.aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        
        # Lucro
        profit = sales_total - expenses_total
        
        return Response({
            'sales': {
                'total': str(sales_total),
                'count': month_sales.count()
            },
            'expenses': {
                'total': str(expenses_total),
                'count': month_expenses.count()
            },
            'profit': {
                'total': str(profit),
                'is_positive': profit >= 0
            },
            'month': now.month,
            'year': now.year
        })
