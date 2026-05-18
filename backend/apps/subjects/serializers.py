from rest_framework import serializers
from .models import (
    AcademicYear, Subject, CourseOutcome, COPOMapping, COPSOMapping
)


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'


class CourseOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseOutcome
        fields = '__all__'


class COPOMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = COPOMapping
        fields = '__all__'


class COPSOMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = COPSOMapping
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    course_outcomes = CourseOutcomeSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = '__all__'
