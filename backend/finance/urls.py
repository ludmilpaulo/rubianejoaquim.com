from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, PersonalExpenseViewSet, PersonalIncomeViewSet,
    BudgetViewSet, GoalViewSet, DebtViewSet, SaleViewSet,
    BusinessExpenseViewSet, BusinessMetricsViewSet, DashboardViewSet,
    ExchangeRateViewSet, UserFavoriteCurrencyViewSet,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')

# Personal Finance
router.register(r'personal/expenses', PersonalExpenseViewSet, basename='personal-expense')
router.register(r'personal/income', PersonalIncomeViewSet, basename='personal-income')
router.register(r'dashboard', DashboardViewSet, basename='finance-dashboard')
router.register(r'exchange-rates', ExchangeRateViewSet, basename='exchange-rate')
router.register(r'favorite-currencies', UserFavoriteCurrencyViewSet, basename='favorite-currency')
router.register(r'personal/budgets', BudgetViewSet, basename='budget')
router.register(r'personal/goals', GoalViewSet, basename='goal')
router.register(r'personal/debts', DebtViewSet, basename='debt')

# Business Finance
router.register(r'business/sales', SaleViewSet, basename='sale')
router.register(r'business/expenses', BusinessExpenseViewSet, basename='business-expense')
router.register(r'business/metrics', BusinessMetricsViewSet, basename='business-metrics')

urlpatterns = [
    path('', include(router.urls)),
]
