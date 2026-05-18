from django.urls import path
from . import views

urlpatterns = [
    path('subjects/<int:alloc_id>/marks/upload-excel/', views.ExcelUploadLogViewSet.as_view({'post': 'create'}), name='faculty-marks-upload'),
    path('subjects/<int:alloc_id>/marks/download-template/', views.ExcelUploadLogViewSet.as_view({'get': 'download_template'}), name='faculty-marks-template'),
    path('subjects/<int:alloc_id>/marks/bulk/', views.StudentMarkViewSet.as_view({'put': 'bulk_update'}), name='faculty-marks-bulk-save'),
    path('marks/bulk-update/', views.StudentMarkViewSet.as_view({'post': 'bulk_update'}), name='faculty-marks-bulk-update-legacy'),
    
    # Faculty Subject Details
    path('subjects/<int:pk>/', views.FacultySubjectViewSet.as_view({'get': 'retrieve'}), name='faculty-subject-detail'),
    path('subjects/<int:pk>/students/', views.FacultySubjectViewSet.as_view({'get': 'students'}), name='faculty-subject-students'),
    path('subjects/<int:pk>/assessments/', views.FacultySubjectViewSet.as_view({'get': 'assessments'}), name='faculty-subject-assessments'),
    path('subjects/<int:pk>/save-cos/', views.FacultySubjectViewSet.as_view({'post': 'save_cos'}), name='faculty-subject-save-cos'),
    path('subjects/<int:pk>/save-mappings/', views.FacultySubjectViewSet.as_view({'post': 'save_mappings'}), name='faculty-subject-save-mappings'),
]
