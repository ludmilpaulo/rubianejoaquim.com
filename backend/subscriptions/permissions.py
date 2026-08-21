from rest_framework.permissions import BasePermission


class IsStaffAdmin(BasePermission):
    """Staff or superuser only — financial admin endpoints."""

    message = 'Acesso negado. Apenas administradores.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or user.is_superuser)
        )
