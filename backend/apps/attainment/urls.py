from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AttainmentConfigViewSet, COAttainmentViewSet,
    POAttainmentViewSet, PSOAttainmentViewSet, ActionTakenReportViewSet
)

router = DefaultRouter()
router.register(r'configs', AttainmentConfigViewSet)
router.register(r'co-attainment', COAttainmentViewSet)
router.register(r'po-attainment', POAttainmentViewSet)
router.register(r'pso-attainment', PSOAttainmentViewSet)
router.register(r'action-taken-reports', ActionTakenReportViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
