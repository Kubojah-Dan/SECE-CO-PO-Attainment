from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentMarkViewSet, ExcelUploadLogViewSet,
    QuestionCOMappingViewSet, StudentQuestionMarkViewSet
)

router = DefaultRouter()
router.register(r'student-marks', StudentMarkViewSet, basename='studentmark')
router.register(r'excel-uploads', ExcelUploadLogViewSet)
router.register(r'question-mappings', QuestionCOMappingViewSet)
router.register(r'question-marks', StudentQuestionMarkViewSet)

urlpatterns = [
    path('student-marks/bulk_update/', StudentMarkViewSet.as_view({'post': 'bulk_update', 'put': 'bulk_update'}), name='student-marks-bulk-update-explicit'),
    path('question-marks/bulk_update/', StudentQuestionMarkViewSet.as_view({'post': 'bulk_update'}), name='question-marks-bulk-update-explicit'),
    path('', include(router.urls)),
]
