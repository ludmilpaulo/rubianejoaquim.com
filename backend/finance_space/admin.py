from django.contrib import admin
from .models import FinanceSpace, FinanceSpaceMember, SharedGoal, SharedBudget, SharedContribution

admin.site.register(FinanceSpace)
admin.site.register(FinanceSpaceMember)
admin.site.register(SharedGoal)
admin.site.register(SharedBudget)
admin.site.register(SharedContribution)
