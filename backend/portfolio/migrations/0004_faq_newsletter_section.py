from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio', '0003_home_sections_resources_contact'),
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
                    ('faq_newsletter', 'FAQ & Newsletter'),
                    ('contact_intro', 'Contact Intro'),
                    ('final_cta', 'Final CTA'),
                    ('statistics', 'Statistics'),
                    ('cta', 'Call to Action'),
                ],
                max_length=64,
                unique=True,
            ),
        ),
    ]
