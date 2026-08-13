from django.contrib import admin
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

admin.site.register(FinanceSpace)
admin.site.register(FinanceSpaceMember)
admin.site.register(SharedGoal)
admin.site.register(SharedBudget)
admin.site.register(SharedContribution)
admin.site.register(FamilyEntry)
admin.site.register(FamilyEntryShare)
admin.site.register(FamilySettlement)
admin.site.register(FamilyActivity)
