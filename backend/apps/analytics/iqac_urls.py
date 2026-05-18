from django.urls import path
from . import views

urlpatterns = [
    # IQAC Dashboard data
    path('dashboard/', views.IQACDashboardView.as_view(), name='iqac-dashboard'),
    path('radar-comparison/', views.POBatchComparisonView.as_view(), name='iqac-radar-comparison'),
    path('attainment-heatmap/', views.SubjectAttainmentHeatmapView.as_view(), name='iqac-attainment-heatmap'),
]
