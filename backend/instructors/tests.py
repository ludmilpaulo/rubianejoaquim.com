from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from courses.models import Category, Course, CourseModule, Enrollment, Lesson
from instructors.models import (
    EducatorApplication,
    EducationBillingSettings,
    EducationPayment,
    InstructorProfile,
    MentorProfile,
    PayoutRequest,
    TutorBooking,
    TutorProfile,
)
from instructors.services import split_amount
from mentorship.models import MentorshipSession


User = get_user_model()


class MarketplaceFoundationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin', email='admin@test.com', password='pass12345', is_staff=True, is_superuser=True
        )
        self.instructors = []
        for i in range(5):
            user = User.objects.create_user(
                username=f'inst{i}', email=f'inst{i}@test.com', password='pass12345',
                first_name=f'Inst', last_name=str(i),
            )
            profile = InstructorProfile.objects.create(
                user=user,
                slug=f'inst-{i}',
                headline='Educator',
                bio='Bio',
                status=InstructorProfile.STATUS_APPROVED,
                is_official=(i == 0),
            )
            self.instructors.append((user, profile))
        self.student_a = User.objects.create_user(
            username='studenta', email='studenta@test.com', password='pass12345'
        )
        self.student_b = User.objects.create_user(
            username='studentb', email='studentb@test.com', password='pass12345'
        )
        self.category = Category.objects.create(slug='finance', name='Finance')
        self.courses = []
        for i, (user, profile) in enumerate(self.instructors):
            course = Course.objects.create(
                title=f'Course {i}',
                slug=f'course-{i}',
                description='A complete description for the course.',
                short_description='Short',
                price=Decimal('100.00'),
                instructor=profile,
                category=self.category,
                status=Course.STATUS_PUBLISHED,
                is_active=True,
                language='pt',
                level='beginner',
            )
            module = CourseModule.objects.create(course=course, title='Module 1', order=0)
            Lesson.objects.create(
                course=course, module=module, title='Lesson 1', slug='lesson-1',
                content='Secret paid content', video_url='https://youtube.com/watch?v=abc',
                is_free=False, duration=10,
            )
            Lesson.objects.create(
                course=course, module=module, title='Preview', slug='preview',
                content='Free preview', is_free=True, duration=5,
            )
            self.courses.append(course)

    def _auth(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_locales_endpoint(self):
        res = self.client.get('/api/locales/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['locales'], ['pt', 'en', 'fr', 'es'])

    def test_unapproved_cannot_create_course(self):
        pending = User.objects.create_user(username='pend', email='pend@test.com', password='pass12345')
        InstructorProfile.objects.create(
            user=pending, slug='pend', status=InstructorProfile.STATUS_PENDING,
        )
        self._auth(pending)
        res = self.client.post('/api/instructors/my-courses/', {
            'title': 'Nope', 'description': 'x', 'price': '10', 'language': 'pt',
        }, format='json')
        self.assertEqual(res.status_code, 403)

    def test_instructor_cannot_edit_another_instructors_course(self):
        a_user, _ = self.instructors[0]
        b_course = self.courses[1]
        self._auth(a_user)
        res = self.client.patch(f'/api/instructors/my-courses/{b_course.id}/', {
            'title': 'Hacked',
        }, format='json')
        self.assertEqual(res.status_code, 404)
        b_course.refresh_from_db()
        self.assertEqual(b_course.title, 'Course 1')

    def test_five_instructors_isolated(self):
        for i, (user, _) in enumerate(self.instructors):
            self._auth(user)
            res = self.client.get('/api/instructors/my-courses/')
            self.assertEqual(res.status_code, 200)
            payload = res.data['results'] if isinstance(res.data, dict) else res.data
            ids = [c['id'] for c in payload]
            self.assertEqual(ids, [self.courses[i].id])

    def test_paid_lesson_content_hidden_without_enrollment(self):
        lesson = Lesson.objects.get(course=self.courses[0], slug='lesson-1')
        res = self.client.get(f'/api/course/lesson/{lesson.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['locked'])
        self.assertEqual(res.data['content'], '')
        self.assertEqual(res.data['video_url'], '')

        preview = Lesson.objects.get(course=self.courses[0], slug='preview')
        res = self.client.get(f'/api/course/lesson/{preview.id}/')
        self.assertFalse(res.data['locked'])
        self.assertIn('Free preview', res.data['content'])

    def test_enrolled_student_sees_paid_lesson(self):
        Enrollment.objects.create(user=self.student_a, course=self.courses[0], status='active')
        lesson = Lesson.objects.get(course=self.courses[0], slug='lesson-1')
        self._auth(self.student_a)
        res = self.client.get(f'/api/course/lesson/{lesson.id}/')
        self.assertFalse(res.data['locked'])
        self.assertIn('Secret', res.data['content'])

    def test_application_then_admin_approve(self):
        self._auth(self.student_a)
        res = self.client.post('/api/instructors/applications/', {
            'full_name': 'Student A',
            'biography': 'I teach finance',
            'roles_requested': ['instructor', 'mentor'],
            'languages': ['pt'],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        app_id = res.data['id']
        self._auth(self.admin)
        res = self.client.post(f'/api/instructors/admin/applications/{app_id}/approve/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(InstructorProfile.objects.get(user=self.student_a).is_approved)
        self.assertTrue(MentorProfile.objects.get(user=self.student_a).is_approved)

    def test_commission_from_settings_not_constant(self):
        EducationBillingSettings.objects.update_or_create(
            pk=1, defaults={'platform_commission_percent': Decimal('10.00')}
        )
        gross, fee, net = split_amount(Decimal('100.00'))
        self.assertEqual(fee, Decimal('10.00'))
        self.assertEqual(net, Decimal('90.00'))
        EducationBillingSettings.objects.filter(pk=1).update(platform_commission_percent=Decimal('25.00'))
        gross, fee, net = split_amount(Decimal('100.00'))
        self.assertEqual(fee, Decimal('25.00'))

    def test_payout_status_admin_only(self):
        _, profile = self.instructors[0]
        EducationPayment.objects.create(
            student=self.student_a,
            instructor=profile,
            product_type='course',
            product_id=self.courses[0].id,
            amount=Decimal('100'),
            platform_fee=Decimal('20'),
            instructor_net=Decimal('80'),
            payment_method='proof_of_payment',
            status=EducationPayment.STATUS_COMPLETED,
            completed_at=timezone.now(),
        )
        self._auth(self.instructors[0][0])
        res = self.client.post('/api/instructors/my-payouts/', {'amount': '50'}, format='json')
        self.assertEqual(res.status_code, 201)
        payout_id = res.data['id']
        res = self.client.post(f'/api/instructors/admin/payouts/{payout_id}/paid/')
        self.assertEqual(res.status_code, 403)
        self._auth(self.admin)
        res = self.client.post(f'/api/instructors/admin/payouts/{payout_id}/paid/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'paid')

    def test_double_booking_rejected(self):
        user, inst = self.instructors[0]
        tutor = TutorProfile.objects.create(
            user=user, instructor=inst, status=InstructorProfile.STATUS_APPROVED, hourly_rate=25,
        )
        start = timezone.now() + timedelta(days=1)
        self._auth(self.student_a)
        payload = {
            'tutor': tutor.id,
            'starts_at': start.isoformat(),
            'duration_minutes': 60,
        }
        res = self.client.post('/api/instructors/tutor/bookings/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self._auth(self.student_b)
        res = self.client.post('/api/instructors/tutor/bookings/', payload, format='json')
        self.assertEqual(res.status_code, 409)

    def test_marketplace_lists_published_only(self):
        draft = Course.objects.create(
            title='Draft', slug='draft-x', description='d', price=10,
            instructor=self.instructors[0][1], status=Course.STATUS_DRAFT, is_active=True,
        )
        res = self.client.get('/api/course/course/')
        payload = res.data['results'] if isinstance(res.data, dict) else res.data
        ids = [c['id'] for c in payload]
        self.assertNotIn(draft.id, ids)
        self.assertIn(self.courses[0].id, ids)
