"""SECE CO-PO Platform — Audit Middleware & Mixin"""
import logging

logger = logging.getLogger(__name__)


class AuditLogMiddleware:
    """
    Middleware that extracts IP and user-agent for audit logging.
    Does not log every request — individual views call AuditLog.log() explicitly.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Attach metadata to request for views to use
        request.audit_ip = self._get_client_ip(request)
        request.audit_user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        # Track active user online status
        user = request.user
        if not user or not user.is_authenticated:
            auth_header = request.META.get('HTTP_AUTHORIZATION')
            if auth_header and auth_header.startswith('Bearer '):
                try:
                    from rest_framework_simplejwt.authentication import JWTAuthentication
                    authenticator = JWTAuthentication()
                    validated_token = authenticator.get_validated_token(auth_header.split(' ')[1])
                    user = authenticator.get_user(validated_token)
                except Exception:
                    pass
        
        if user and user.is_authenticated:
            from django.core.cache import cache
            cache.set(f"user_online_{user.id}", True, 300) # Keep active status for 5 mins
            
        response = self.get_response(request)
        return response

    @staticmethod
    def _get_client_ip(request):
        """Extract real client IP (handles proxies)."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class AuditMixin:
    """Mixin for views to easily create audit log entries."""

    def log_action(self, request, user, action, table_name='', record_id=None,
                   old_values=None, new_values=None, description=''):
        from .models import AuditLog
        AuditLog.log(
            user=user,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=getattr(request, 'audit_ip', None),
            user_agent=getattr(request, 'audit_user_agent', ''),
            description=description,
        )
