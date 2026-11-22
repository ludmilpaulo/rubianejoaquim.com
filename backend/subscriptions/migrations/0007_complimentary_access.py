from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('subscriptions', '0006_commerce_payment'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionbillingsettings',
            name='complimentary_access_until',
            field=models.DateTimeField(
                blank=True,
                help_text='When set in the future, every authenticated user gets free app access until this time.',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='subscriptionbillingsettings',
            name='complimentary_plan_tier',
            field=models.CharField(
                choices=[
                    ('free', 'Free'),
                    ('premium', 'Premium'),
                    ('business', 'Business'),
                    ('family', 'Family'),
                ],
                default='premium',
                help_text='Plan features granted during the complimentary access window.',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='subscriptionbillingsettings',
            name='complimentary_set_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='subscriptionbillingsettings',
            name='complimentary_set_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='set_complimentary_access',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
