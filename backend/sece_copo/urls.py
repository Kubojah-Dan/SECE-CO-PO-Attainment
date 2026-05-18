"""
SECE CO-PO Platform — Main URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Django Admin
    path('django-admin/', admin.site.urls),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # ─── Authentication ─────────────────────────────────
    path('api/auth/', include('apps.authentication.urls')),

    # ─── Admin Role Endpoints ────────────────────────────
    path('api/admin/', include('apps.departments.urls')),
    path('api/admin/', include('apps.users.admin_urls')),
    path('api/admin/analytics/', include('apps.analytics.admin_urls')),

    # ─── HOD Endpoints ──────────────────────────────────
    path('api/hod/', include('apps.analytics.hod_urls')),

    # ─── Faculty Endpoints ───────────────────────────────
    path('api/faculty/', include('apps.subjects.faculty_urls')),
    path('api/faculty/', include('apps.marks.faculty_urls')),
    path('api/faculty/', include('apps.attainment.faculty_urls')),

    # ─── IQAC Endpoints ─────────────────────────────────
    path('api/iqac/', include('apps.analytics.iqac_urls')),

    # ─── Shared Endpoints ───────────────────────────────
    path('api/', include('apps.subjects.urls')),
    path('api/allocations/', include('apps.allocations.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/marks/', include('apps.marks.urls')),
    path('api/attainment/', include('apps.attainment.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/surveys/', include('apps.surveys.urls')),
    path('api/', include('apps.audit.urls')),

    # ─── Health Check ───────────────────────────────────
    path('health/', include('utils.health_urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    # Debug toolbar
    import debug_toolbar
    urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]

# Admin customization
admin.site.site_header = 'SECE CO-PO Attainment Platform'
admin.site.site_title = 'SECE-COPO Admin'
admin.site.index_title = 'Platform Administration'
