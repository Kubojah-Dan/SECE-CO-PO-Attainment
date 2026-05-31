"""SECE CO-PO Platform — Authentication URLs"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('staff-users', views.StaffUserViewSet, basename='staff-users')

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('refresh/', views.TokenRefreshView.as_view(), name='auth-refresh'),
    path('me/', views.MeView.as_view(), name='auth-me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='auth-change-password'),
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    # HOD read-only staff list for a department
    path('departments/<int:dept_id>/staff/', views.DepartmentStaffListView.as_view(), name='department-staff-list'),
    # Staff user management (admin only) — registered via router
    path('', include(router.urls)),
]
