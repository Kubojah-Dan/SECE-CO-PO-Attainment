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


class IsStaffUser(BasePermission):
    """Only HR Staff can access."""
    message = 'You must be HR Staff to perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role == 'staff'
        )


class IsAssignedStaff(BasePermission):
    """
    View-level: user must be role=='staff'.
    Object-level (obj = SubjectAllocation):
      1. Staff must be assigned to the allocation's department.
      2. The allocation must have staff_mark_entry_enabled=True.
    """
    message = 'You are not authorised to access this subject.'

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role == 'staff'
        )

    def has_object_permission(self, request, view, obj):
        # obj is a SubjectAllocation instance
        if not hasattr(request.user, 'staff_profile'):
            return False
        staff_dept_ids = list(
            request.user.staff_profile.departments.values_list('id', flat=True)
        )
        return (
            obj.subject.department_id in staff_dept_ids
            and obj.staff_mark_entry_enabled
        )


class IsFacultyOrStaff(BasePermission):
    """
    View-level: role must be 'faculty' or 'staff'.
    Object-level (obj = SubjectAllocation):
      - Faculty: always permitted (they are the allocation owner; existing checks
        on the ViewSet queryset already scope to faculty.user == request.user).
      - Staff: must be assigned to the allocation's department AND
        the allocation must have staff_mark_entry_enabled=True.
    Used on mark upload and template download endpoints only.
    """
    message = 'You are not authorised to perform this action on this subject.'

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('faculty', 'staff')
        )

    def has_object_permission(self, request, view, obj):
        # obj is a SubjectAllocation instance
        if request.user.role == 'faculty':
            # Faculty are permitted — the ViewSet queryset already scopes to
            # allocations owned by the requesting faculty member.
            return True
        if request.user.role == 'staff':
            if not hasattr(request.user, 'staff_profile'):
                return False
            staff_dept_ids = list(
                request.user.staff_profile.departments.values_list('id', flat=True)
            )
            return (
                obj.subject.department_id in staff_dept_ids
                and obj.staff_mark_entry_enabled
            )
        return False
