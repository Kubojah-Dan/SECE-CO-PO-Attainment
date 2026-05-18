from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
