from rest_framework import viewsets, permissions
from .models import SurveyTemplate, SurveyResponse
from .serializers import SurveyTemplateSerializer, SurveyResponseSerializer

class SurveyTemplateViewSet(viewsets.ModelViewSet):
    queryset = SurveyTemplate.objects.all()
    serializer_class = SurveyTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class SurveyResponseViewSet(viewsets.ModelViewSet):
    queryset = SurveyResponse.objects.all()
    serializer_class = SurveyResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
