from rest_framework import serializers
from .models import (
    AcademicYear, Subject, CourseOutcome, COPOMapping, COPSOMapping
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


class COPOMappingSerializer(serializers.ModelSerializer):
    po_code = serializers.CharField(source='po.po_code', read_only=True)

    class Meta:
        model = COPOMapping
        fields = ['id', 'co', 'po', 'po_code', 'correlation_level']


class COPSOMappingSerializer(serializers.ModelSerializer):
    pso_code = serializers.CharField(source='pso.pso_code', read_only=True)

    class Meta:
        model = COPSOMapping
        fields = ['id', 'co', 'pso', 'pso_code', 'correlation_level']


class CourseOutcomeSerializer(serializers.ModelSerializer):
    po_mappings = COPOMappingSerializer(many=True, read_only=True)
    pso_mappings = COPSOMappingSerializer(many=True, read_only=True)

    class Meta:
        model = CourseOutcome
        fields = ['id', 'subject', 'co_number', 'co_code', 'description', 'bloom_level', 'po_mappings', 'pso_mappings']


class SubjectSerializer(serializers.ModelSerializer):
    course_outcomes = CourseOutcomeSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = '__all__'
