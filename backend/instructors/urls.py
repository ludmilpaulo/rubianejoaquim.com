from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'applications', views.EducatorApplicationViewSet, basename='educator-application')
router.register(r'public', views.InstructorPublicViewSet, basename='instructor-public')
router.register(r'me', views.InstructorMeViewSet, basename='instructor-me')
router.register(r'my-courses', views.InstructorCourseViewSet, basename='instructor-courses')
router.register(r'my-modules', views.InstructorModuleViewSet, basename='instructor-modules')
router.register(r'my-lessons', views.InstructorLessonViewSet, basename='instructor-lessons')
router.register(r'my-payout-methods', views.PayoutMethodViewSet, basename='payout-methods')
router.register(r'my-payouts', views.PayoutRequestViewSet, basename='payout-requests')
router.register(r'saved', views.SavedItemViewSet, basename='saved-items')
router.register(r'mentors', views.MentorPublicViewSet, basename='mentors-public')
router.register(r'tutors', views.TutorPublicViewSet, basename='tutors-public')
router.register(r'tutor/offerings', views.TutorOfferingViewSet, basename='tutor-offerings')
router.register(r'tutor/availability', views.TutorAvailabilityViewSet, basename='tutor-availability')
router.register(r'tutor/bookings', views.TutorBookingViewSet, basename='tutor-bookings')

admin_router = DefaultRouter()
admin_router.register(r'applications', views.AdminEducatorApplicationViewSet, basename='admin-educator-applications')
admin_router.register(r'instructors', views.AdminInstructorViewSet, basename='admin-instructors')
admin_router.register(r'payouts', views.AdminPayoutViewSet, basename='admin-payouts')
admin_router.register(r'payments', views.AdminEducationPaymentViewSet, basename='admin-edu-payments')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
    path('admin/overview/', views.education_admin_overview),
    path('admin/billing/', views.education_billing_settings),
    path('admin/translations/', views.translation_coverage),
    path('payee/', views.official_payee),
]
