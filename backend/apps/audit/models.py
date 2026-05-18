"""
SECE CO-PO Platform — Audit Log Models & Middleware
Tracks all mark entry, modification, and sensitive operations.
"""
import json
import logging
from django.db import models
from apps.authentication.models import User

logger = logging.getLogger(__name__)


class AuditLog(models.Model):
    """
    Comprehensive audit trail for all sensitive operations.
    Captures who did what, when, on which record, from which IP.
    """
    class Action(models.TextChoices):
        LOGIN = 'LOGIN', 'Login'
        LOGOUT = 'LOGOUT', 'Logout'
        CHANGE_PASSWORD = 'CHANGE_PASSWORD', 'Change Password'
        CREATE = 'CREATE', 'Create'
        UPDATE = 'UPDATE', 'Update'
        DELETE = 'DELETE', 'Delete'
        MARKS_ENTRY = 'MARKS_ENTRY', 'Marks Entry'
        MARKS_UPDATE = 'MARKS_UPDATE', 'Marks Update'
        EXCEL_UPLOAD = 'EXCEL_UPLOAD', 'Excel Upload'
        CALCULATE_ATTAINMENT = 'CALCULATE_ATTAINMENT', 'Calculate Attainment'
        EXPORT_REPORT = 'EXPORT_REPORT', 'Export Report'
        CONFIG_CHANGE = 'CONFIG_CHANGE', 'Configuration Change'

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=50, choices=Action.choices, db_index=True)
    table_name = models.CharField(max_length=100, blank=True)
    record_id = models.BigIntegerField(null=True, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_log'
        verbose_name = 'Audit Log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['table_name', 'record_id']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else 'Anonymous'
        return f"{self.timestamp} | {user_str} | {self.action} | {self.table_name}:{self.record_id}"

    @classmethod
    def log(cls, user, action, table_name='', record_id=None, old_values=None,
            new_values=None, ip_address=None, description='', user_agent=''):
        """Convenience class method to create an audit log entry."""
        try:
            cls.objects.create(
                user=user,
                action=action,
                table_name=table_name,
                record_id=record_id,
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
                description=description,
                user_agent=user_agent,
            )
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")


class Notification(models.Model):
    """
    Real-time push notifications of system events for specific users.
    """
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    level = models.CharField(max_length=20, default='info') # info, success, warning, danger
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notification'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} | {self.title} | {self.is_read}"


def create_notification(user, title, message, level='info'):
    """Helper utility to cleanly dispatch notifications to any user."""
    try:
        if user:
            return Notification.objects.create(
                user=user,
                title=title,
                message=message,
                level=level
            )
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        return None
