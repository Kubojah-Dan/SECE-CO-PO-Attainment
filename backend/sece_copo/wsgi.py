"""SECE CO-PO Platform — WSGI Application"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sece_copo.settings.production')
application = get_wsgi_application()
