from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0012_merge_fx_source'),
    ]

    operations = [
        migrations.AddField(
            model_name='debtpayment',
            name='exchange_rate_source',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='debtpayment',
            name='exchange_rate_timestamp',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='debtpayment',
            name='status',
            field=models.CharField(
                choices=[('partial', 'Partial'), ('paid', 'Paid'), ('cancelled', 'Cancelled')],
                default='partial',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='goalcontribution',
            name='exchange_rate_source',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='goalcontribution',
            name='exchange_rate_timestamp',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
