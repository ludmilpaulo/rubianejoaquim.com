from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_dark_mode_user_onboarding_completed_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='onboarding_goals',
            field=models.JSONField(blank=True, default=list, help_text='Goal ids from onboarding: save, debt, business, learn, budget'),
        ),
        migrations.AddField(
            model_name='user',
            name='finance_level',
            field=models.CharField(blank=True, default='beginner', help_text='beginner, intermediate, advanced', max_length=20),
        ),
    ]
