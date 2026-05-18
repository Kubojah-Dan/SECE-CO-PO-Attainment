from rest_framework import serializers
from .models import SurveyTemplate, SurveyResponse

class SurveyTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyTemplate
        fields = '__all__'

class SurveyResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyResponse
        fields = '__all__'
