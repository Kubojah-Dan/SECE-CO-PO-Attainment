from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssessmentTypeViewSet, SubjectAllocationViewSet,
    SubjectAssessmentConfigViewSet, COAssessmentMappingViewSet
)

router = DefaultRouter()
router.register(r'assessment-types', AssessmentTypeViewSet)
router.register(r'allocations', SubjectAllocationViewSet)
router.register(r'assessment-configs', SubjectAssessmentConfigViewSet)
router.register(r'co-assessment-mappings', COAssessmentMappingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
