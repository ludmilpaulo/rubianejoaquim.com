import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def map_member_roles(apps, schema_editor):
    Member = apps.get_model('finance_space', 'FinanceSpaceMember')
    Member.objects.filter(role='member').update(role='adult')


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('finance_space', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='financespace',
            name='currency',
            field=models.CharField(default='AOA', max_length=3),
        ),
        migrations.AddField(
            model_name='financespace',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='financespace',
            name='require_approval',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='financespace',
            name='invite_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='financespacemember',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('pending', 'Pending'), ('declined', 'Declined')],
                default='active',
                max_length=20,
            ),
        ),
        migrations.RunPython(map_member_roles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='financespacemember',
            name='role',
            field=models.CharField(
                choices=[
                    ('owner', 'Owner'),
                    ('adult', 'Adult member'),
                    ('child', 'Child / dependent'),
                    ('viewer', 'Viewer'),
                ],
                default='adult',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='sharedgoal',
            name='currency',
            field=models.CharField(default='AOA', max_length=3),
        ),
        migrations.AddField(
            model_name='sharedgoal',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('private', 'Private'),
                    ('family', 'Family'),
                    ('selected', 'Selected members'),
                ],
                default='family',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='sharedbudget',
            name='currency',
            field=models.CharField(default='AOA', max_length=3),
        ),
        migrations.AddField(
            model_name='sharedbudget',
            name='visibility',
            field=models.CharField(
                choices=[
                    ('private', 'Private'),
                    ('family', 'Family'),
                    ('selected', 'Selected members'),
                ],
                default='family',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='sharedcontribution',
            name='currency',
            field=models.CharField(default='AOA', max_length=3),
        ),
        migrations.AddField(
            model_name='sharedcontribution',
            name='converted_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='sharedcontribution',
            name='exchange_rate',
            field=models.DecimalField(blank=True, decimal_places=8, max_digits=18, null=True),
        ),
        migrations.AddField(
            model_name='sharedcontribution',
            name='exchange_rate_source',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.CreateModel(
            name='FamilyEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(
                    choices=[
                        ('income', 'Income'),
                        ('expense', 'Expense'),
                        ('debt', 'Debt'),
                        ('payment', 'Debt payment'),
                        ('contribution', 'Goal contribution'),
                        ('settlement', 'Settlement'),
                        ('bill', 'Recurring bill'),
                    ],
                    max_length=20,
                )),
                ('title', models.CharField(max_length=200)),
                ('category', models.CharField(blank=True, max_length=80)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(default='AOA', max_length=3)),
                ('converted_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('exchange_rate', models.DecimalField(blank=True, decimal_places=8, max_digits=18, null=True)),
                ('exchange_rate_source', models.CharField(blank=True, default='', max_length=64)),
                ('exchange_rate_timestamp', models.DateTimeField(blank=True, null=True)),
                ('visibility', models.CharField(
                    choices=[
                        ('private', 'Private'),
                        ('family', 'Family'),
                        ('selected', 'Selected members'),
                    ],
                    default='family',
                    max_length=20,
                )),
                ('due_date', models.DateField(blank=True, null=True)),
                ('date', models.DateField()),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('paid_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='family_paid_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('space', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='entries',
                    to='finance_space.financespace',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='family_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FamilyEntryShare',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('share_amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('settled', models.BooleanField(default=False)),
                ('entry', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='shares',
                    to='finance_space.familyentry',
                )),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FamilySettlement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('currency', models.CharField(default='AOA', max_length=3)),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('paid', 'Paid')],
                    default='pending',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('from_user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='settlements_paid',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('space', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='settlements',
                    to='finance_space.financespace',
                )),
                ('to_user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='settlements_received',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
        migrations.CreateModel(
            name='FamilyActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.CharField(max_length=300)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('space', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='activities',
                    to='finance_space.financespace',
                )),
                ('user', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
