from django.conf import settings
from django.db import models
from decimal import Decimal

User = settings.AUTH_USER_MODEL

VISIBILITY_CHOICES = [
    ('private', 'Private'),
    ('family', 'Family'),
    ('selected', 'Selected members'),
]

ROLE_CHOICES = [
    ('owner', 'Owner'),
    ('adult', 'Adult member'),
    ('child', 'Child / dependent'),
    ('viewer', 'Viewer'),
]

MEMBER_STATUS = [
    ('active', 'Active'),
    ('pending', 'Pending'),
    ('declined', 'Declined'),
]


class FinanceSpace(models.Model):
    """Shared family financial space."""
    name = models.CharField(max_length=120)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_finance_spaces')
    invite_code = models.CharField(max_length=12, unique=True)
    currency = models.CharField(max_length=3, default='AOA')
    description = models.TextField(blank=True)
    require_approval = models.BooleanField(default=True)
    invite_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class FinanceSpaceMember(models.Model):
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='finance_space_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='adult')
    status = models.CharField(max_length=20, choices=MEMBER_STATUS, default='active')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['space', 'user']


class SharedGoal(models.Model):
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='shared_goals')
    title = models.CharField(max_length=200)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0'))
    currency = models.CharField(max_length=3, default='AOA')
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='family')
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
    currency = models.CharField(max_length=3, default='AOA')
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='family')


class SharedContribution(models.Model):
    goal = models.ForeignKey(SharedGoal, on_delete=models.CASCADE, related_name='contributions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='AOA')
    converted_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    exchange_rate_source = models.CharField(max_length=64, blank=True, default='')
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


ENTRY_KINDS = [
    ('income', 'Income'),
    ('expense', 'Expense'),
    ('debt', 'Debt'),
    ('payment', 'Debt payment'),
    ('contribution', 'Goal contribution'),
    ('settlement', 'Settlement'),
    ('bill', 'Recurring bill'),
]


class FamilyEntry(models.Model):
    """Ledger row: original amount/currency never overwritten."""
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='entries')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='family_entries')
    kind = models.CharField(max_length=20, choices=ENTRY_KINDS)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=80, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='AOA')
    converted_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=18, decimal_places=8, null=True, blank=True)
    exchange_rate_source = models.CharField(max_length=64, blank=True, default='')
    exchange_rate_timestamp = models.DateTimeField(null=True, blank=True)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='family')
    paid_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='family_paid_entries'
    )
    due_date = models.DateField(null=True, blank=True)
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']


class FamilyEntryShare(models.Model):
    entry = models.ForeignKey(FamilyEntry, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    share_amount = models.DecimalField(max_digits=12, decimal_places=2)
    settled = models.BooleanField(default=False)


class FamilySettlement(models.Model):
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='settlements')
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='settlements_paid')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='settlements_received')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='AOA')
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('paid', 'Paid')],
        default='pending',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)


class FamilyActivity(models.Model):
    space = models.ForeignKey(FinanceSpace, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    message = models.CharField(max_length=300)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
