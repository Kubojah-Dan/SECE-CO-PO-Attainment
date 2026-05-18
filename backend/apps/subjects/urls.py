from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicYearViewSet, SubjectViewSet, CourseOutcomeViewSet,
    COPOMappingViewSet, COPSOMappingViewSet
)

router = DefaultRouter()
router.register(r'academic-years', AcademicYearViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'course-outcomes', CourseOutcomeViewSet)
router.register(r'co-po-mappings', COPOMappingViewSet)
router.register(r'co-pso-mappings', COPSOMappingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
