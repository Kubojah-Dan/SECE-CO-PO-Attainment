"""
SECE CO-PO Platform — Django Project Initialization
"""
from .celery import app as celery_app

__all__ = ('celery_app',)
