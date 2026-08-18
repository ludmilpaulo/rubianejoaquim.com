from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0014_receipt_expense_fx_platform'),
    ]

    operations = [
        migrations.AddField(
            model_name='goal',
            name='progress_notified_100',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='goal',
            name='progress_notified_75',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='goal',
            name='reminder_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='goal',
            name='reminder_frequency',
            field=models.CharField(
                choices=[('once', 'Once'), ('daily', 'Daily'), ('weekly', 'Weekly')],
                default='once',
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name='goal',
            name='reminder_offsets_minutes',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='Minutes before reminder_time to fire, e.g. [10, 30, 60, 1440]',
            ),
        ),
        migrations.AddField(
            model_name='goal',
            name='reminder_time',
            field=models.TimeField(blank=True, null=True),
        ),
    ]
