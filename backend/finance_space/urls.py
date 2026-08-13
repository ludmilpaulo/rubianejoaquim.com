from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FinanceSpaceViewSet,
    SharedGoalViewSet,
    SharedBudgetViewSet,
    SharedContributionViewSet,
    FamilyEntryViewSet,
)

router = DefaultRouter()
router.register(r'spaces', FinanceSpaceViewSet, basename='finance-space')
router.register(r'shared-goals', SharedGoalViewSet, basename='shared-goal')
router.register(r'shared-budgets', SharedBudgetViewSet, basename='shared-budget')
router.register(r'contributions', SharedContributionViewSet, basename='shared-contribution')
router.register(r'entries', FamilyEntryViewSet, basename='family-entry')

urlpatterns = [
    path('', include(router.urls)),
]
