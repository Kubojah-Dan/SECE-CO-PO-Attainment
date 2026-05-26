from django.urls import path
from . import views

urlpatterns = [
    # HOD Dashboard data
    path('dashboard/', views.HODDashboardView.as_view(), name='hod-dashboard'),
    path('attainment-summary/', views.HODAttainmentSummaryView.as_view(), name='hod-attainment-summary'),
    path('department-reports/', views.HODDepartmentReportsView.as_view(), name='hod-department-reports'),
]
