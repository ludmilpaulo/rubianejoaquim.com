from django.conf import settings
from django.db import models
from decimal import Decimal

User = settings.AUTH_USER_MODEL


class FinanceSpace(models.Model):
    """Shared family/couple finance space."""
    name = models.CharField(max_length=120)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_finance_spaces')
    invite_code = models.CharField(max_length=12, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class FinanceSpaceMember(models.Model):
    ROLE_CHOICES = [('owner', 'Owner'), ('member', 'Member')]
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='finance_space_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['space', 'user']


class SharedGoal(models.Model):
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='shared_goals')
    title = models.CharField(max_length=200)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    target_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def progress_percentage(self):
        if self.target_amount <= 0:
            return 0
        return min(100, float(self.current_amount / self.target_amount) * 100)


class SharedBudget(models.Model):
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='shared_budgets')
    name = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    spent = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()


class SharedContribution(models.Model):
    """Member contribution toward a shared goal."""
    goal = models.ForeignKey(SharedGoal, on_delete=models.CASCADE, related_name='contributions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
