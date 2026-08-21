from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from config.locales import supported_locales_payload
from instructors.permissions import (
    IsApprovedInstructor,
    IsApprovedTutor,
    IsStaffAdmin,
    approved_instructor,
    approved_tutor,
    is_staff_admin,
)
from instructors.serializers import (
    EducationBillingSettingsSerializer,
    EducationPaymentSerializer,
    EducatorApplicationSerializer,
    InstructorMeSerializer,
    InstructorPublicSerializer,
    MentorPublicSerializer,
    PayoutMethodSerializer,
    PayoutRequestSerializer,
    SavedItemSerializer,
    TutorAvailabilitySerializer,
    TutorBookingSerializer,
    TutorOfferingSerializer,
    TutorPublicSerializer,
)
from instructors.services import (
    ensure_profiles_from_application,
    instructor_earnings_summary,
)
from .models import (
    EducatorApplication,
    EducationBillingSettings,
    EducationPayment,
    InstructorProfile,
    MentorProfile,
    PayoutMethod,
    PayoutRequest,
    SavedItem,
    TutorAvailability,
    TutorBooking,
    TutorOffering,
    TutorProfile,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def locales_view(request):
    return Response(supported_locales_payload())


@api_view(['GET'])
@permission_classes([AllowAny])
def official_payee(request):
    """Bank details for proof-of-payment: official instructor default payout method."""
    from instructors.models import InstructorProfile, PayoutMethod
    official = InstructorProfile.objects.filter(is_official=True, status='approved').first()
    method = None
    if official:
        method = official.payout_methods.filter(is_default=True).first() or official.payout_methods.first()
    if method is None:
        from subscriptions.models import SubscriptionBillingSettings
        row = SubscriptionBillingSettings.objects.filter(pk=1).first()
        return Response({
            'payee_name': getattr(row, 'payee_name', '') if row else '',
            'iban': getattr(row, 'iban', '') if row else '',
            'currency': 'AOA',
        })
    return Response({
        'payee_name': method.payee_name,
        'iban': method.iban,
        'currency': method.currency,
        'method': method.method,
    })


class EducatorApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = EducatorApplicationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return EducatorApplication.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        roles = serializer.validated_data.get('roles_requested') or ['instructor']
        serializer.save(user=self.request.user, roles_requested=roles, status=EducatorApplication.STATUS_PENDING)

    @action(detail=False, methods=['get'])
    def mine(self, request):
        latest = self.get_queryset().first()
        if not latest:
            return Response({'application': None, 'roles': self._roles(request.user)})
        return Response({
            'application': self.get_serializer(latest).data,
            'roles': self._roles(request.user),
        })

    def _roles(self, user):
        return {
            'is_instructor': bool(getattr(user, 'instructor_profile', None) and user.instructor_profile.is_approved),
            'is_mentor': bool(getattr(user, 'mentor_profile', None) and user.mentor_profile.is_approved),
            'is_tutor': bool(getattr(user, 'tutor_profile', None) and user.tutor_profile.is_approved),
            'is_admin': is_staff_admin(user),
        }


class InstructorPublicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InstructorPublicSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    queryset = InstructorProfile.objects.filter(status=InstructorProfile.STATUS_APPROVED)

    @action(detail=True, methods=['get'])
    def courses(self, request, slug=None):
        from courses.models import Course
        from courses.serializers import CourseSerializer

        instructor = self.get_object()
        courses = Course.objects.filter(
            instructor=instructor,
            status=Course.STATUS_PUBLISHED,
            is_active=True,
        )
        return Response(CourseSerializer(courses, many=True, context={'request': request}).data)


class InstructorMeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsApprovedInstructor]

    def list(self, request):
        profile = approved_instructor(request.user)
        if profile is None and is_staff_admin(request.user):
            profile = InstructorProfile.objects.filter(user=request.user).first()
        if profile is None:
            return Response({'detail': 'instructor_required'}, status=status.HTTP_403_FORBIDDEN)
        return Response(InstructorMeSerializer(profile, context={'request': request}).data)

    @action(detail=False, methods=['patch'])
    def profile(self, request):
        profile = approved_instructor(request.user)
        if profile is None:
            return Response({'detail': 'instructor_required'}, status=status.HTTP_403_FORBIDDEN)
        for field in (
            'headline', 'bio', 'country', 'languages', 'expertise', 'qualifications',
            'experience', 'linkedin_url', 'website', 'youtube_channel', 'social_profiles',
        ):
            if field in request.data:
                setattr(profile, field, request.data[field])
        if request.FILES.get('photo'):
            profile.photo = request.FILES['photo']
        profile.save()
        return Response(InstructorMeSerializer(profile, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        from courses.models import Course, CourseReview, Enrollment

        profile = approved_instructor(request.user)
        if profile is None:
            return Response({'detail': 'instructor_required'}, status=status.HTTP_403_FORBIDDEN)

        courses = Course.objects.filter(instructor=profile)
        enrollments = Enrollment.objects.filter(course__instructor=profile, status='active')
        reviews = CourseReview.objects.filter(course__instructor=profile, status='published')
        earnings = instructor_earnings_summary(profile)
        mentor = getattr(request.user, 'mentor_profile', None)
        tutor = getattr(request.user, 'tutor_profile', None)
        return Response({
            'instructor': InstructorMeSerializer(profile, context={'request': request}).data,
            'students': enrollments.values('user').distinct().count(),
            'active_students': enrollments.filter(
                activated_at__gte=timezone.now() - timedelta(days=30)
            ).values('user').distinct().count() if enrollments.exists() else 0,
            'courses': courses.filter(kind=Course.KIND_COURSE).count(),
            'tutorials': courses.filter(kind=Course.KIND_TUTORIAL).count(),
            'mentorships': mentor.packages.count() if mentor else 0,
            'drafts': courses.filter(status=Course.STATUS_DRAFT).count(),
            'pending_review': courses.filter(status=Course.STATUS_PENDING).count(),
            'published': courses.filter(status=Course.STATUS_PUBLISHED).count(),
            'rejected': courses.filter(status=Course.STATUS_REJECTED).count(),
            'rating': str(profile.rating_avg),
            'rating_count': profile.rating_count,
            'reviews': reviews.count(),
            'earnings': earnings,
            'is_mentor': bool(mentor and mentor.is_approved),
            'is_tutor': bool(tutor and tutor.is_approved),
        })

    @action(detail=False, methods=['get'])
    def students(self, request):
        from courses.models import Enrollment
        from courses.serializers import EnrollmentSerializer

        profile = approved_instructor(request.user)
        qs = Enrollment.objects.filter(course__instructor=profile).select_related('user', 'course')
        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(EnrollmentSerializer(qs[:200], many=True, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        from courses.models import Course, Enrollment, Progress

        profile = approved_instructor(request.user)
        courses = Course.objects.filter(instructor=profile)
        enrollments = Enrollment.objects.filter(course__instructor=profile)
        active = enrollments.filter(status='active')
        total_lessons = sum(c.lessons.count() for c in courses)
        completed_progress = Progress.objects.filter(
            lesson__course__instructor=profile,
            completed=True,
        ).count()
        completion_rate = 0
        if active.exists() and total_lessons:
            completion_rate = round(
                (completed_progress / (active.count() * total_lessons)) * 100, 1
            )
        earnings = instructor_earnings_summary(profile)
        return Response({
            'enrollments': enrollments.count(),
            'active_enrollments': active.count(),
            'views': enrollments.count(),
            'completion_rate': completion_rate,
            'revenue': earnings['total_sales'],
            'conversion_rate': 0,
            'rating': str(profile.rating_avg),
        })

    @action(detail=False, methods=['get'])
    def earnings(self, request):
        profile = approved_instructor(request.user)
        return Response(instructor_earnings_summary(profile))

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        profile = approved_instructor(request.user)
        qs = EducationPayment.objects.filter(instructor=profile)
        return Response(EducationPaymentSerializer(qs[:200], many=True).data)


class InstructorCourseViewSet(viewsets.ModelViewSet):
    """Instructors manage only their own courses."""
    permission_classes = [IsAuthenticated, IsApprovedInstructor]

    def get_serializer_class(self):
        from courses.serializers import CourseDetailSerializer, CourseWriteSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CourseWriteSerializer
        if self.action == 'retrieve':
            return CourseDetailSerializer
        from courses.serializers import CourseSerializer
        return CourseSerializer

    def get_queryset(self):
        from courses.models import Course
        if is_staff_admin(self.request.user):
            return Course.objects.all()
        profile = approved_instructor(self.request.user)
        if profile is None:
            return Course.objects.none()
        return Course.objects.filter(instructor=profile)

    def perform_create(self, serializer):
        profile = approved_instructor(self.request.user)
        slug = serializer.validated_data.get('slug') or slugify(serializer.validated_data.get('title', ''))
        serializer.save(instructor=profile, slug=slug, status='draft')

    def perform_update(self, serializer):
        instance = self.get_object()
        profile = approved_instructor(self.request.user)
        if not is_staff_admin(self.request.user) and instance.instructor_id != profile.id:
            raise PermissionError('not_owner')
        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        from courses.models import Course
        course = self.get_object()
        errors = _validate_course_for_publish(course)
        if errors:
            return Response({'detail': 'validation_failed', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        course.status = Course.STATUS_PENDING
        course.submitted_at = timezone.now()
        course.rejection_reason = ''
        course.save(update_fields=['status', 'submitted_at', 'rejection_reason'])
        from courses.serializers import CourseDetailSerializer
        return Response(CourseDetailSerializer(course, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reorder_modules(self, request, pk=None):
        from courses.models import CourseModule
        course = self.get_object()
        order = request.data.get('order') or []
        for index, module_id in enumerate(order):
            CourseModule.objects.filter(id=module_id, course=course).update(order=index)
        return Response({'ok': True})


def _validate_course_for_publish(course) -> list[str]:
    errors = []
    if not course.title:
        errors.append('title')
    if not course.description:
        errors.append('description')
    if not course.image:
        errors.append('thumbnail')
    if not course.instructor_id:
        errors.append('instructor')
    if not course.category_id:
        errors.append('category')
    if not course.language:
        errors.append('language')
    if course.lessons.count() < 1:
        errors.append('curriculum')
    if not course.is_free and (course.price is None or course.price < 0):
        errors.append('pricing')
    return errors


class InstructorModuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsApprovedInstructor]

    def get_serializer_class(self):
        from courses.serializers import CourseModuleSerializer
        return CourseModuleSerializer

    def get_queryset(self):
        from courses.models import CourseModule
        profile = approved_instructor(self.request.user)
        qs = CourseModule.objects.all()
        if not is_staff_admin(self.request.user):
            qs = qs.filter(course__instructor=profile)
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        from courses.models import Course
        course = serializer.validated_data['course']
        profile = approved_instructor(self.request.user)
        if not is_staff_admin(self.request.user) and course.instructor_id != profile.id:
            raise PermissionError('not_owner')
        serializer.save()

    @action(detail=True, methods=['post'])
    def reorder_lessons(self, request, pk=None):
        from courses.models import Lesson
        module = self.get_object()
        order = request.data.get('order') or []
        for index, lesson_id in enumerate(order):
            Lesson.objects.filter(id=lesson_id, module=module).update(order=index)
        return Response({'ok': True})


class InstructorLessonViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsApprovedInstructor]

    def get_serializer_class(self):
        from courses.serializers import AdminLessonSerializer
        return AdminLessonSerializer

    def get_queryset(self):
        from courses.models import Lesson
        profile = approved_instructor(self.request.user)
        qs = Lesson.objects.all()
        if not is_staff_admin(self.request.user):
            qs = qs.filter(course__instructor=profile)
        course_id = self.request.query_params.get('course')
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def perform_create(self, serializer):
        course = serializer.validated_data['course']
        profile = approved_instructor(self.request.user)
        if not is_staff_admin(self.request.user) and course.instructor_id != profile.id:
            raise PermissionError('not_owner')
        serializer.save()


class PayoutMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutMethodSerializer
    permission_classes = [IsAuthenticated, IsApprovedInstructor]

    def get_queryset(self):
        profile = approved_instructor(self.request.user)
        return PayoutMethod.objects.filter(instructor=profile)

    def perform_create(self, serializer):
        serializer.save(instructor=approved_instructor(self.request.user))


class PayoutRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutRequestSerializer
    permission_classes = [IsAuthenticated, IsApprovedInstructor]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        profile = approved_instructor(self.request.user)
        return PayoutRequest.objects.filter(instructor=profile)

    def create(self, request, *args, **kwargs):
        profile = approved_instructor(request.user)
        summary = instructor_earnings_summary(profile)
        amount = request.data.get('amount')
        try:
            from decimal import Decimal
            amount_d = Decimal(str(amount))
        except Exception:
            return Response({'detail': 'invalid_amount'}, status=status.HTTP_400_BAD_REQUEST)
        available = Decimal(summary['available'])
        if amount_d <= 0 or amount_d > available:
            return Response({'detail': 'insufficient_available'}, status=status.HTTP_400_BAD_REQUEST)
        method = profile.payout_methods.filter(is_default=True).first() or profile.payout_methods.first()
        snapshot = {}
        method_code = 'bank_transfer'
        if method:
            snapshot = {
                'payee_name': method.payee_name,
                'method': method.method,
                'iban_last4': (method.iban or '')[-4:],
                'currency': method.currency,
            }
            method_code = method.method
        payout = PayoutRequest.objects.create(
            instructor=profile,
            amount=amount_d,
            currency=request.data.get('currency') or summary['currency'],
            method=method_code,
            payee_snapshot=snapshot,
            status=PayoutRequest.STATUS_PENDING,
        )
        return Response(PayoutRequestSerializer(payout).data, status=status.HTTP_201_CREATED)


class SavedItemViewSet(viewsets.ModelViewSet):
    serializer_class = SavedItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MentorPublicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MentorPublicSerializer
    permission_classes = [AllowAny]
    queryset = MentorProfile.objects.filter(status=InstructorProfile.STATUS_APPROVED)


class TutorPublicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TutorPublicSerializer
    permission_classes = [AllowAny]
    queryset = TutorProfile.objects.filter(status=InstructorProfile.STATUS_APPROVED)


class TutorOfferingViewSet(viewsets.ModelViewSet):
    serializer_class = TutorOfferingSerializer
    permission_classes = [IsAuthenticated, IsApprovedTutor]

    def get_queryset(self):
        tutor = approved_tutor(self.request.user)
        return TutorOffering.objects.filter(tutor=tutor)

    def perform_create(self, serializer):
        serializer.save(tutor=approved_tutor(self.request.user))


class TutorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = TutorAvailabilitySerializer
    permission_classes = [IsAuthenticated, IsApprovedTutor]

    def get_queryset(self):
        tutor = approved_tutor(self.request.user)
        return TutorAvailability.objects.filter(tutor=tutor)

    def perform_create(self, serializer):
        serializer.save(tutor=approved_tutor(self.request.user))


class TutorBookingViewSet(viewsets.ModelViewSet):
    serializer_class = TutorBookingSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        tutor = approved_tutor(user)
        if tutor:
            return TutorBooking.objects.filter(Q(tutor=tutor) | Q(student=user))
        return TutorBooking.objects.filter(student=user)

    def create(self, request, *args, **kwargs):
        from django.utils.dateparse import parse_datetime
        tutor = TutorProfile.objects.filter(
            pk=request.data.get('tutor'),
            status=InstructorProfile.STATUS_APPROVED,
        ).first()
        if tutor is None:
            return Response({'detail': 'tutor_not_found'}, status=status.HTTP_404_NOT_FOUND)
        starts_raw = request.data.get('starts_at')
        starts_at = parse_datetime(str(starts_raw)) if starts_raw else None
        if starts_at is None:
            return Response({'detail': 'invalid_starts_at'}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(starts_at):
            starts_at = timezone.make_aware(starts_at, timezone.get_current_timezone())
        duration = int(request.data.get('duration_minutes') or tutor.session_duration_minutes or 60)
        ends_at = starts_at + timedelta(minutes=duration)
        try:
            with transaction.atomic():
                booking = TutorBooking.objects.create(
                    tutor=tutor,
                    student=request.user,
                    offering_id=request.data.get('offering') or None,
                    starts_at=starts_at,
                    ends_at=ends_at,
                    duration_minutes=duration,
                    status=TutorBooking.STATUS_CONFIRMED,
                    notes=request.data.get('notes') or '',
                )
        except IntegrityError:
            return Response({'detail': 'slot_taken'}, status=status.HTTP_409_CONFLICT)
        return Response(TutorBookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        tutor = approved_tutor(request.user)
        is_owner = booking.student_id == request.user.id
        is_tutor = tutor is not None and booking.tutor_id == tutor.id
        if not (is_staff_admin(request.user) or is_owner or is_tutor):
            return Response({'detail': 'not_owner'}, status=status.HTTP_403_FORBIDDEN)
        if booking.status in (TutorBooking.STATUS_COMPLETED, TutorBooking.STATUS_CANCELLED):
            return Response({'detail': 'cannot_cancel'}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = TutorBooking.STATUS_CANCELLED
        booking.save(update_fields=['status'])
        return Response(TutorBookingSerializer(booking).data)


class AdminEducatorApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = EducatorApplicationSerializer
    permission_classes = [IsAuthenticated, IsStaffAdmin]
    queryset = EducatorApplication.objects.all()

    def _transition(self, request, new_status):
        app = self.get_object()
        app.status = new_status
        app.admin_notes = request.data.get('admin_notes', app.admin_notes)
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save()
        if new_status == EducatorApplication.STATUS_APPROVED:
            ensure_profiles_from_application(app)
            from instructors.notify import send_locale_email
            send_locale_email(
                app.user,
                'application_approved',
                'Your Zenda educator application was approved. You can now open the instructor dashboard.',
            )
        elif new_status == EducatorApplication.STATUS_SUSPENDED:
            InstructorProfile.objects.filter(user=app.user).update(status=InstructorProfile.STATUS_SUSPENDED)
        return Response(self.get_serializer(app).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._transition(request, EducatorApplication.STATUS_APPROVED)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._transition(request, EducatorApplication.STATUS_REJECTED)

    @action(detail=True, methods=['post'], url_path='request-info')
    def request_info(self, request, pk=None):
        return self._transition(request, EducatorApplication.STATUS_MORE_INFO)

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        return self._transition(request, EducatorApplication.STATUS_SUSPENDED)


class AdminInstructorViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InstructorPublicSerializer
    permission_classes = [IsAuthenticated, IsStaffAdmin]
    queryset = InstructorProfile.objects.all()

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        profile = self.get_object()
        profile.status = InstructorProfile.STATUS_SUSPENDED
        profile.save(update_fields=['status'])
        return Response(self.get_serializer(profile).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        profile = self.get_object()
        profile.status = InstructorProfile.STATUS_APPROVED
        profile.save(update_fields=['status'])
        return Response(self.get_serializer(profile).data)


class AdminPayoutViewSet(viewsets.ModelViewSet):
    serializer_class = PayoutRequestSerializer
    permission_classes = [IsAuthenticated, IsStaffAdmin]
    queryset = PayoutRequest.objects.select_related('instructor')
    http_method_names = ['get', 'patch', 'post', 'head', 'options']

    def _set_status(self, request, new_status):
        payout = self.get_object()
        payout.status = new_status
        payout.processed_by = request.user
        payout.processed_at = timezone.now()
        payout.notes = request.data.get('notes', payout.notes)
        payout.save()
        return Response(self.get_serializer(payout).data)

    @action(detail=True, methods=['post'])
    def processing(self, request, pk=None):
        return self._set_status(request, PayoutRequest.STATUS_PROCESSING)

    @action(detail=True, methods=['post'])
    def paid(self, request, pk=None):
        return self._set_status(request, PayoutRequest.STATUS_PAID)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._set_status(request, PayoutRequest.STATUS_REJECTED)


class AdminEducationPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EducationPaymentSerializer
    permission_classes = [IsAuthenticated, IsStaffAdmin]
    queryset = EducationPayment.objects.all()


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated, IsStaffAdmin])
def education_billing_settings(request):
    row = EducationBillingSettings.get_solo()
    if request.method == 'PATCH':
        ser = EducationBillingSettingsSerializer(row, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save(updated_by=request.user)
        return Response(ser.data)
    return Response(EducationBillingSettingsSerializer(row).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffAdmin])
def education_admin_overview(request):
    from courses.models import Course, CourseReview, Enrollment
    from django.contrib.auth import get_user_model

    User = get_user_model()
    pending_apps = EducatorApplication.objects.filter(status=EducatorApplication.STATUS_PENDING).count()
    pending_courses = Course.objects.filter(status=Course.STATUS_PENDING).count()
    revenue = EducationPayment.objects.filter(
        status=EducationPayment.STATUS_COMPLETED
    ).aggregate(s=Sum('amount'))['s'] or 0
    return Response({
        'students': User.objects.filter(enrollments__isnull=False).distinct().count(),
        'instructors': InstructorProfile.objects.filter(status=InstructorProfile.STATUS_APPROVED).count(),
        'mentors': MentorProfile.objects.filter(status=InstructorProfile.STATUS_APPROVED).count(),
        'tutors': TutorProfile.objects.filter(status=InstructorProfile.STATUS_APPROVED).count(),
        'courses': Course.objects.filter(kind=Course.KIND_COURSE).count(),
        'published_courses': Course.objects.filter(status=Course.STATUS_PUBLISHED).count(),
        'tutorials': Course.objects.filter(kind=Course.KIND_TUTORIAL).count(),
        'enrollments': Enrollment.objects.count(),
        'reviews': CourseReview.objects.count(),
        'revenue': str(revenue),
        'pending_approvals': pending_apps + pending_courses,
        'pending_applications': pending_apps,
        'pending_courses': pending_courses,
        'pending_payouts': PayoutRequest.objects.filter(status=PayoutRequest.STATUS_PENDING).count(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffAdmin])
def translation_coverage(request):
    from config.i18n_coverage import compute_coverage
    return Response(compute_coverage())
