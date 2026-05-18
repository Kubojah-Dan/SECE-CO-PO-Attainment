from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollegeViewSet, DepartmentViewSet, ProgrammeViewSet,
    ProgramOutcomeViewSet, ProgramSpecificOutcomeViewSet,
    BatchViewSet, SectionViewSet, RegulationViewSet
)

router = DefaultRouter()
router.register(r'colleges', CollegeViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'programmes', ProgrammeViewSet)
router.register(r'program-outcomes', ProgramOutcomeViewSet)
router.register(r'psos', ProgramSpecificOutcomeViewSet)
router.register(r'batches', BatchViewSet)
router.register(r'sections', SectionViewSet)
router.register(r'regulations', RegulationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
