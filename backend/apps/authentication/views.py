"""SECE CO-PO Platform — Authentication Views"""
import logging
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from apps.audit.mixins import AuditMixin
from .models import User, PasswordResetToken
from .serializers import (
    LoginSerializer, UserSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
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
