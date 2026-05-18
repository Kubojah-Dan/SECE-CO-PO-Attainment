"""SECE CO-PO Platform — Celery Application"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sece_copo.settings.development')

app = Celery('sece_copo')

# Load celery config from Django settings (CELERY_ prefix)
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
