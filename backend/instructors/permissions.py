from rest_framework.permissions import BasePermission, SAFE_METHODS


def is_staff_admin(user) -> bool:
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


def approved_instructor(user):
    profile = getattr(user, 'instructor_profile', None)
    if profile is None:
        return None
    return profile if profile.is_approved else None


def approved_mentor(user):
    profile = getattr(user, 'mentor_profile', None)
    if profile is None:
        return None
    return profile if profile.is_approved else None


def approved_tutor(user):
    profile = getattr(user, 'tutor_profile', None)
    if profile is None:
        return None
    return profile if profile.is_approved else None


class IsStaffAdmin(BasePermission):
    message = 'admin_required'

    def has_permission(self, request, view):
        return is_staff_admin(request.user)


class IsApprovedInstructor(BasePermission):
    message = 'instructor_required'

    def has_permission(self, request, view):
        if is_staff_admin(request.user):
            return True
        return approved_instructor(request.user) is not None


class IsApprovedMentor(BasePermission):
    message = 'mentor_required'

    def has_permission(self, request, view):
        if is_staff_admin(request.user):
            return True
        return approved_mentor(request.user) is not None


class IsApprovedTutor(BasePermission):
    message = 'tutor_required'

    def has_permission(self, request, view):
        if is_staff_admin(request.user):
            return True
        return approved_tutor(request.user) is not None


class IsOwnerInstructorOrAdmin(BasePermission):
    """Object-level: instructor who owns the course/package, or staff."""

    message = 'not_owner'

    def has_object_permission(self, request, view, obj):
        if is_staff_admin(request.user):
            return True
        if request.method in SAFE_METHODS:
            return True
        instructor = approved_instructor(request.user)
        if instructor is None:
            return False
        owner = getattr(obj, 'instructor', None)
        if owner is None and hasattr(obj, 'course'):
            owner = getattr(obj.course, 'instructor', None)
        if owner is None and hasattr(obj, 'mentor'):
            mentor = obj.mentor
            return bool(mentor and mentor.user_id == request.user.id)
        return bool(owner and owner.user_id == request.user.id)
