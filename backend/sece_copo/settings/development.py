"""SECE CO-PO Platform — Development Settings"""
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend', '0.0.0.0']

# Development database override (can use local postgres)
# DATABASES['default']['HOST'] = 'localhost'

# Enable Django Debug Toolbar in development
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']

# Relaxed CORS for development
CORS_ALLOW_ALL_ORIGINS = True

# Email backend (console for dev)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable rate limiting in development
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []

# Synchronous task execution in development
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
