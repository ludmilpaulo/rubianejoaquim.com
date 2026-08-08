import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_user_onboarding_goals_finance_level'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='profile_image_url',
            field=models.URLField(blank=True, help_text='External profile image from social providers', max_length=500),
        ),
        migrations.AlterField(
            model_name='user',
            name='email',
            field=models.EmailField(blank=True, max_length=254, null=True, unique=True),
        ),
        migrations.CreateModel(
            name='SocialAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('google', 'Google'), ('facebook', 'Facebook'), ('tiktok', 'TikTok')], max_length=32)),
                ('provider_user_id', models.CharField(max_length=255)),
                ('provider_email', models.EmailField(blank=True, max_length=254, null=True)),
                ('provider_data', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='social_accounts', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='OAuthState',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('state', models.CharField(db_index=True, max_length=64, unique=True)),
                ('provider', models.CharField(max_length=32)),
                ('purpose', models.CharField(choices=[('login', 'Login'), ('link', 'Link')], default='login', max_length=16)),
                ('redirect_path', models.CharField(blank=True, default='/area-do-aluno', max_length=255)),
                ('code_verifier', models.CharField(blank=True, default='', max_length=128)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('consumed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='oauth_states', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name='socialaccount',
            constraint=models.UniqueConstraint(fields=('provider', 'provider_user_id'), name='uniq_social_provider_user'),
        ),
        migrations.AddConstraint(
            model_name='socialaccount',
            constraint=models.UniqueConstraint(fields=('user', 'provider'), name='uniq_user_provider'),
        ),
        migrations.AddIndex(
            model_name='socialaccount',
            index=models.Index(fields=['provider', 'provider_user_id'], name='accounts_so_provide_7c8e0a_idx'),
        ),
    ]
