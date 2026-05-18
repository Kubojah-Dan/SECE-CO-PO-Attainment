from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'templates', views.SurveyTemplateViewSet)
router.register(r'responses', views.SurveyResponseViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
