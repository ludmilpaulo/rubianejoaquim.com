from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0002_cms_platform_expansion'),
    ]

    operations = [
        migrations.AlterField(
            model_name='homesection',
            name='section_key',
            field=models.CharField(
                choices=[
                    ('hero', 'Hero'),
                    ('about', 'About'),
                    ('services_intro', 'Services Intro'),
                    ('portfolio_intro', 'Portfolio Intro'),
                    ('showreel', 'Showreel'),
                    ('zenda', 'Zenda'),
                    ('case_studies_intro', 'Case Studies Intro'),
                    ('testimonials_intro', 'Testimonials Intro'),
                    ('education', 'Education'),
                    ('resources_intro', 'Resources Intro'),
                    ('final_cta', 'Final CTA'),
                    ('contact_intro', 'Contact Intro'),
                    ('statistics', 'Statistics'),
                    ('cta', 'Call to Action'),
                ],
                max_length=64,
                unique=True,
            ),
        ),
    ]
