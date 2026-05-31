"""SECE CO-PO Platform — Authentication Views"""
import logging
from django.utils import timezone
from rest_framework import status, generics, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from apps.audit.mixins import AuditMixin
from .models import User, PasswordResetToken, StaffProfile
from .permissions import IsAdminUser, IsHODUser
from .serializers import (
    LoginSerializer, UserSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    StaffProfileSerializer, CreateStaffUserSerializer,
)

logger = logging.getLogger(__name__)


class LoginView(AuditMixin, APIView):
    """
    POST /api/auth/login/
    Authenticates user, returns JWT access + refresh tokens and user profile.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})

        if not serializer.is_valid():
            logger.warning(f"Failed login attempt for: {request.data.get('email', 'unknown')}")
            return Response(
                {'error': 'Invalid credentials', 'details': serializer.errors},
                status=status.HTTP_401_UNAUTHORIZED
            )

        user = serializer.validated_data['user']

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        # Audit log
        self.log_action(request, user, 'LOGIN', 'users', user.id)

        logger.info(f"User {user.email} ({user.role}) logged in successfully")

        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'token_type': 'Bearer',
            'expires_in': 28800,  # 8 hours in seconds
            'user': UserSerializer(user).data,
        }, status=status.HTTP_200_OK)


class LogoutView(AuditMixin, APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            self.log_action(request, request.user, 'LOGOUT', 'users', request.user.id)
            logger.info(f"User {request.user.email} logged out")

            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns current authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        """Update own profile (name, phone, photo)."""
        from .serializers import UserUpdateSerializer
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            password = serializer.validated_data.pop('password', None)
            user = serializer.save()
            if password:
                user.set_password(password)
                user.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(AuditMixin, APIView):
    """
    PATCH /api/auth/change-password/
    Change password for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            self.log_action(request, request.user, 'CHANGE_PASSWORD', 'users', request.user.id)
            logger.info(f"Password changed for user {request.user.email}")
            return Response({'message': 'Password changed successfully.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/
    Sends password reset email.
    """
    permission_classes = [AllowAny]
    throttle_scope = 'login'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email'].lower()
            try:
                user = User.objects.get(email=email, is_active=True)
                self._send_reset_email(user)
            except User.DoesNotExist:
                pass  # Don't reveal if email exists

        # Always return success to prevent email enumeration
        return Response({
            'message': 'If your email is registered, you will receive a reset link.'
        })

    def _send_reset_email(self, user):
        import secrets
        from django.core.mail import send_mail
        from django.conf import settings

        token = secrets.token_urlsafe(48)
        PasswordResetToken.objects.create(user=user, token=token)

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_mail(
            subject='SECE CO-PO Portal — Password Reset',
            message=f'Click to reset your password: {reset_url}\nThis link expires in 2 hours.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Reset password using the token from email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_str = serializer.validated_data['token']
        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or expired reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        if not reset_token.is_valid():
            return Response({'error': 'Reset token has expired or already been used.'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        reset_token.is_used = True
        reset_token.save()

        return Response({'message': 'Password reset successfully. You can now log in.'})


class TokenRefreshView(APIView):
    """
    POST /api/auth/refresh/
    Exchange refresh token for new access token.
    (Wraps simplejwt TokenRefreshView with custom response format)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTRefreshView
        return SimpleJWTRefreshView.as_view()(request._request)


class StaffUserViewSet(viewsets.ModelViewSet):
    """
    Admin-only ViewSet for managing HR Staff users.
    POST   /auth/staff-users/              — Create staff user + profile atomically
    GET    /auth/staff-users/              — List all staff users
    GET    /auth/staff-users/{id}/         — Retrieve a staff user
    PATCH  /auth/staff-users/{id}/         — Update staff user info
    DELETE /auth/staff-users/{id}/         — Delete staff user
    PATCH  /auth/staff-users/{id}/departments/ — Replace department assignments
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return (
            User.objects.filter(role='staff')
            .select_related('staff_profile')
            .prefetch_related('staff_profile__departments')
            .order_by('first_name', 'last_name')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateStaffUserSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateStaffUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['patch'], url_path='departments')
    def update_departments(self, request, pk=None):
        """
        PATCH /auth/staff-users/{id}/departments/
        Body: { "department_ids": [1, 2, 3] }
        Replaces the staff member's department assignments. Admin only.
        """
        user = self.get_object()
        if not hasattr(user, 'staff_profile'):
            return Response(
                {'detail': 'This user does not have a staff profile.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ids = request.data.get('department_ids', [])
        from apps.departments.models import Department
        depts = Department.objects.filter(id__in=ids)
        user.staff_profile.departments.set(depts)
        return Response(StaffProfileSerializer(user.staff_profile).data)


class DepartmentStaffListView(generics.ListAPIView):
    """
    GET /auth/departments/{dept_id}/staff/
    HOD can view all staff assigned to their department. Read-only.
    """
    permission_classes = [IsAuthenticated, IsHODUser]
    serializer_class = StaffProfileSerializer

    def get_queryset(self):
        dept_id = self.kwargs['dept_id']
        # Verify the requesting HOD owns this department
        try:
            hod_dept = self.request.user.hod_profile.department
        except Exception:
            raise PermissionDenied('HOD profile not found.')
        if hod_dept.id != int(dept_id):
            raise PermissionDenied(
                'You can only view staff for your own department.'
            )
        return (
            StaffProfile.objects.filter(departments__id=dept_id)
            .prefetch_related('departments')
            .distinct()
        )
