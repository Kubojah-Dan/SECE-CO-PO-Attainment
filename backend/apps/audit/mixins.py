"""
SECE CO-PO Platform — Audit Mixins
Provides helper methods for logging actions in views.
"""
from .models import AuditLog

class AuditMixin:
    """Mixin to provide audit logging capabilities to views."""
    
    def log_action(self, request, user, action, table_name='', record_id=None, 
                   old_values=None, new_values=None, description=''):
        """Logs an action to the AuditLog table."""
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        AuditLog.log(
            user=user,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            description=description
        )

    def _get_client_ip(self, request):
        """Helper to extract IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
