from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('finance', '0005_goal_contribution_debt_payment'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='user',
            field=models.ForeignKey(
                blank=True,
                help_text='Null = system category shared by all users',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='finance_categories',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
