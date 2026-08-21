"""Seed marketplace test accounts and default categories.

Accounts:
  admin@zenda.test / Pass12345!
  instructor.a@zenda.test … instructor.e@zenda.test
  mentor.a@zenda.test
  tutor.a@zenda.test
  student.a@zenda.test / student.b@zenda.test
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from courses.models import Category, Course, CourseModule, Lesson
from instructors.models import (
    EducationBillingSettings,
    InstructorProfile,
    MentorProfile,
    PayoutMethod,
    TutorOffering,
    TutorProfile,
)
from instructors.services import get_or_create_official_instructor
from mentorship.models import MentorshipPackage

User = get_user_model()
PASSWORD = 'Pass12345!'


class Command(BaseCommand):
    help = 'Seed marketplace instructor/student accounts and taxonomy'

    def handle(self, *args, **options):
        EducationBillingSettings.get_solo()
        official = get_or_create_official_instructor()
        self.stdout.write(f'Official instructor: {official.slug}')

        for course in Course.objects.filter(instructor__isnull=True):
            course.instructor = official
            course.status = Course.STATUS_PUBLISHED if course.is_active else Course.STATUS_UNPUBLISHED
            course.language = course.language or 'pt'
            course.save()
            if not course.modules.exists():
                module = CourseModule.objects.create(course=course, title='Módulo 1', order=0)
                course.lessons.filter(module__isnull=True).update(module=module)

        for pkg in MentorshipPackage.objects.filter(mentor__isnull=True):
            mentor = MentorProfile.objects.filter(user=official.user).first()
            if mentor:
                pkg.mentor = mentor
                pkg.status = MentorshipPackage.STATUS_PUBLISHED
                pkg.save()

        roots = [
            ('finance', 'Finance', {'pt': 'Finanças', 'en': 'Finance', 'fr': 'Finance', 'es': 'Finanzas'}, [
                ('personal-finance', 'Personal Finance'),
                ('budgeting', 'Budgeting'),
                ('investing', 'Investing'),
                ('accounting', 'Accounting'),
                ('entrepreneurship', 'Entrepreneurship'),
            ]),
            ('technology', 'Technology', {'pt': 'Tecnologia', 'en': 'Technology', 'fr': 'Technologie', 'es': 'Tecnología'}, [
                ('programming', 'Programming'),
                ('web-development', 'Web Development'),
                ('mobile-development', 'Mobile Development'),
                ('ai', 'AI'),
                ('cybersecurity', 'Cybersecurity'),
            ]),
            ('business', 'Business', {'pt': 'Negócios', 'en': 'Business', 'fr': 'Affaires', 'es': 'Negocios'}, [
                ('marketing', 'Marketing'),
                ('sales', 'Sales'),
                ('leadership', 'Leadership'),
                ('management', 'Management'),
            ]),
            ('education', 'Education', {'pt': 'Educação', 'en': 'Education', 'fr': 'Éducation', 'es': 'Educación'}, [
                ('languages', 'Languages'),
                ('mathematics', 'Mathematics'),
                ('study-skills', 'Study Skills'),
            ]),
        ]
        finance = None
        for slug, name, i18n, children in roots:
            parent, _ = Category.objects.get_or_create(
                slug=slug, defaults={'name': name, 'name_i18n': i18n}
            )
            if slug == 'finance':
                finance = parent
            for cslug, cname in children:
                Category.objects.get_or_create(slug=cslug, defaults={'name': cname, 'parent': parent})

        def user(email, username, first, last, staff=False):
            obj, created = User.objects.get_or_create(
                email=email,
                defaults={'username': username, 'first_name': first, 'last_name': last, 'is_staff': staff, 'is_superuser': staff},
            )
            obj.set_password(PASSWORD)
            if staff:
                obj.is_staff = True
                obj.is_superuser = True
            obj.save()
            return obj

        admin = user('admin@zenda.test', 'zenda-admin', 'Zenda', 'Admin', staff=True)
        self.stdout.write(f'Admin {admin.email}')

        for letter in 'abcde':
            u = user(f'instructor.{letter}@zenda.test', f'instructor-{letter}', 'Instructor', letter.upper())
            profile, _ = InstructorProfile.objects.get_or_create(
                user=u,
                defaults={
                    'slug': f'instructor-{letter}',
                    'headline': f'Educator {letter.upper()}',
                    'bio': f'Demo instructor {letter.upper()}',
                    'status': InstructorProfile.STATUS_APPROVED,
                    'languages': ['pt', 'en'],
                    'expertise': ['Finance'],
                    'country': 'AO',
                },
            )
            profile.status = InstructorProfile.STATUS_APPROVED
            profile.save()
            PayoutMethod.objects.get_or_create(
                instructor=profile,
                defaults={'payee_name': profile.display_name, 'method': 'bank_transfer', 'currency': 'AOA'},
            )
            if not Course.objects.filter(instructor=profile).exists():
                course = Course.objects.create(
                    title=f'{profile.display_name} — Personal Finance',
                    slug=slugify(f'{profile.slug}-personal-finance'),
                    description='Demo marketplace course.',
                    short_description='Learn personal finance.',
                    price=Decimal('49.00'),
                    instructor=profile,
                    category=finance,
                    status=Course.STATUS_PUBLISHED,
                    is_active=True,
                    language='pt',
                    kind=Course.KIND_COURSE,
                )
                module = CourseModule.objects.create(course=course, title='Getting started', order=0)
                Lesson.objects.create(
                    course=course, module=module, title='Welcome', slug='welcome',
                    is_free=True, content='Preview lesson', duration=8,
                )
                Lesson.objects.create(
                    course=course, module=module, title='Core lesson', slug='core',
                    content='Paid lesson body', duration=20,
                )

        mentor_user = user('mentor.a@zenda.test', 'mentor-a', 'Mentor', 'A')
        inst = InstructorProfile.objects.filter(user=mentor_user).first()
        if inst is None:
            inst, _ = InstructorProfile.objects.get_or_create(
                user=mentor_user,
                defaults={'slug': 'mentor-a', 'status': InstructorProfile.STATUS_APPROVED, 'headline': 'Mentor'},
            )
        mentor, _ = MentorProfile.objects.get_or_create(
            user=mentor_user,
            defaults={'instructor': inst, 'status': InstructorProfile.STATUS_APPROVED, 'headline': 'Business mentor'},
        )
        MentorshipPackage.objects.get_or_create(
            title='60-minute session',
            defaults={
                'description': 'One-time mentorship',
                'duration_minutes': 60,
                'sessions': 1,
                'price': Decimal('30.00'),
                'mentor': mentor,
                'offering_type': MentorshipPackage.TYPE_ONE_TIME,
                'status': MentorshipPackage.STATUS_PUBLISHED,
            },
        )

        tutor_user = user('tutor.a@zenda.test', 'tutor-a', 'Tutor', 'A')
        t_inst, _ = InstructorProfile.objects.get_or_create(
            user=tutor_user,
            defaults={'slug': 'tutor-a', 'status': InstructorProfile.STATUS_APPROVED},
        )
        tutor, _ = TutorProfile.objects.get_or_create(
            user=tutor_user,
            defaults={
                'instructor': t_inst,
                'status': InstructorProfile.STATUS_APPROVED,
                'hourly_rate': Decimal('25.00'),
                'subjects': ['Mathematics', 'Accounting', 'Finance'],
                'languages': ['pt', 'en'],
            },
        )
        TutorOffering.objects.get_or_create(
            tutor=tutor,
            title='Finance tutoring',
            defaults={'hourly_rate': Decimal('25.00'), 'description': '1:1 tutoring'},
        )

        user('student.a@zenda.test', 'student-a', 'Student', 'A')
        user('student.b@zenda.test', 'student-b', 'Student', 'B')
        self.stdout.write(self.style.SUCCESS(f'Seeded marketplace accounts (password {PASSWORD})'))
