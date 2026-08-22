from django.db import migrations
from django.utils.text import slugify


def backfill(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    InstructorProfile = apps.get_model('instructors', 'InstructorProfile')
    MentorProfile = apps.get_model('instructors', 'MentorProfile')
    Course = apps.get_model('courses', 'Course')
    CourseModule = apps.get_model('courses', 'CourseModule')
    Lesson = apps.get_model('courses', 'Lesson')
    MentorshipPackage = apps.get_model('mentorship', 'MentorshipPackage')
    EducationBillingSettings = apps.get_model('instructors', 'EducationBillingSettings')

    EducationBillingSettings.objects.get_or_create(pk=1)

    official = InstructorProfile.objects.filter(is_official=True).first()
    if official is None:
        user = (
            User.objects.filter(email__icontains='rubiane').first()
            or User.objects.filter(is_superuser=True).order_by('id').first()
            or User.objects.filter(is_staff=True).order_by('id').first()
        )
        if user is None:
            return
        full_name = f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
        slug = slugify(full_name or user.username or 'rubiane-joaquim') or 'rubiane-joaquim'
        official = InstructorProfile.objects.create(
            user=user,
            slug=slug,
            headline='Financial Educator & Business Mentor',
            bio='Official Zenda instructor.',
            country='AO',
            languages=['pt', 'en'],
            expertise=['Finance', 'Business', 'Investing'],
            status='approved',
            is_official=True,
        )
        MentorProfile.objects.get_or_create(
            user=user,
            defaults={
                'instructor': official,
                'headline': official.headline,
                'bio': official.bio,
                'languages': official.languages,
                'subjects': official.expertise,
                'status': 'approved',
            },
        )

    Course.objects.filter(instructor__isnull=True).update(instructor=official)
    Course.objects.filter(is_active=True).exclude(status='unpublished').update(status='published')
    Course.objects.filter(is_active=False).update(status='unpublished')

    for course in Course.objects.all():
        if not CourseModule.objects.filter(course=course).exists():
            module = CourseModule.objects.create(course=course, title='Módulo 1', order=0)
            Lesson.objects.filter(course=course, module__isnull=True).update(module=module)

    mentor = MentorProfile.objects.filter(user_id=official.user_id).first()
    if mentor:
        MentorshipPackage.objects.filter(mentor__isnull=True).update(
            mentor=mentor, status='published'
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0006_marketplace_foundation'),
        ('mentorship', '0002_marketplace_foundation'),
        ('instructors', '0001_marketplace_foundation'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
