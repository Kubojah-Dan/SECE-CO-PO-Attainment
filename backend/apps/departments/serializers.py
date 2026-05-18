from rest_framework import serializers
from .models import (
    College, Department, Programme, ProgramOutcome,
    ProgramSpecificOutcome, Batch, Section, Regulation,
    ProgrammeTemplate
)

class RegulationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Regulation
        fields = '__all__'


class ProgrammeTemplateSerializer(serializers.ModelSerializer):
    regulation_name = serializers.CharField(source='regulation.name', read_only=True)

    class Meta:
        model = ProgrammeTemplate
        fields = '__all__'


class CollegeSerializer(serializers.ModelSerializer):
    class Meta:
        model = College
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class ProgramOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramOutcome
        fields = '__all__'


class ProgramSpecificOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramSpecificOutcome
        fields = '__all__'


class ProgrammeSerializer(serializers.ModelSerializer):
    program_outcomes = ProgramOutcomeSerializer(many=True, read_only=True)
    psos = ProgramSpecificOutcomeSerializer(many=True, read_only=True)
    regulation_name = serializers.CharField(source='regulation.name', read_only=True)
    regulation_details = RegulationSerializer(source='regulation', read_only=True)

    class Meta:
        model = Programme
        fields = '__all__'


class SectionSerializer(serializers.ModelSerializer):
    batch_label = serializers.CharField(source='batch.label', read_only=True)
    programme_name = serializers.CharField(source='batch.programme.name', read_only=True)

    class Meta:
        model = Section
        fields = ['id', 'batch', 'name', 'strength', 'created_at', 'batch_label', 'programme_name']


class BatchSerializer(serializers.ModelSerializer):
    sections = SectionSerializer(many=True, read_only=True)

    class Meta:
        model = Batch
        fields = '__all__'
