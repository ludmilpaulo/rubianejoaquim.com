from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ai_copilot', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='facts',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='message',
            name='proposed_action',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
