"""SECE CO-PO Platform — Role-Based Permission Classes"""
from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Only Super Admins can access."""
    message = 'You must be a Super Admin to perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsHODUser(BasePermission):
    """Only HODs can access."""
    message = 'You must be a Department HOD to perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'hod')


class IsFacultyUser(BasePermission):
    """Only Faculty can access."""
    message = 'You must be Faculty to perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'faculty')


class IsIQACUser(BasePermission):
    """Only IQAC members can access."""
    message = 'You must be an IQAC member to perform this action.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'iqac')


class IsAdminOrHOD(BasePermission):
    """Admin or HOD can access."""
    message = 'You must be Admin or HOD to perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'hod')
        )


class IsAdminOrIQAC(BasePermission):
    """Admin or IQAC can access."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'iqac')
        )


class IsAuthenticatedAnyRole(BasePermission):
    """Any authenticated user."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class DepartmentScopedPermission(BasePermission):
    """
    Ensures HOD/Faculty can only access resources in their own department.
    Admin and IQAC have unrestricted access.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role in ('admin', 'iqac'):
            return True

        # Get the department_id from the object
        dept_id = None
        if hasattr(obj, 'department_id'):
            dept_id = obj.department_id
        elif hasattr(obj, 'department'):
            dept_id = obj.department.id if obj.department else None

        if dept_id is None:
            return True  # No dept restriction on this object

        if user.role == 'hod':
            return user.hod_profile.department_id == dept_id
        elif user.role == 'faculty':
            return user.faculty_profile.department_id == dept_id

        return False

