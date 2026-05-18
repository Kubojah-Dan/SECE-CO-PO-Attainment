from django.urls import path
from . import views

urlpatterns = [
    path('generate/', views.GenerateReportView.as_view(), name='generate-report'),
    path('generate/<int:alloc_id>/', views.GenerateReportView.as_view(), name='generate-report-detail'),
    path('generate/template/', views.TemplateGenerationView.as_view(), name='template-download'),
    path('generate/master/', views.MasterInstitutionalReportView.as_view(), name='master-report'),
]
