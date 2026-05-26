from rest_framework import serializers
from .models import (
    AttainmentConfig, COAttainment, POAttainment, PSOAttainment, ActionTakenReport
)

class ActionTakenReportSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject_allocation.subject.subject_code', read_only=True)
    subject_name = serializers.CharField(source='subject_allocation.subject.subject_name', read_only=True)
    section_name = serializers.CharField(source='subject_allocation.section.name', read_only=True)
    faculty_name = serializers.CharField(source='subject_allocation.faculty.user.get_full_name', read_only=True)

    class Meta:
        model = ActionTakenReport
        fields = '__all__'

class AttainmentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttainmentConfig
        fields = '__all__'


class COAttainmentSerializer(serializers.ModelSerializer):
    co_code = serializers.CharField(source='co.co_code', read_only=True)
    description = serializers.CharField(source='co.description', read_only=True)
    subject_code = serializers.CharField(source='subject_allocation.subject.subject_code', read_only=True)
    subject_name = serializers.CharField(source='subject_allocation.subject.subject_name', read_only=True)
    section_name = serializers.CharField(source='subject_allocation.section.name', read_only=True)

    class Meta:
        model = COAttainment
        fields = '__all__'


class POAttainmentSerializer(serializers.ModelSerializer):
    po_code = serializers.CharField(source='po.po_code', read_only=True)

    class Meta:
        model = POAttainment
        fields = '__all__'


class PSOAttainmentSerializer(serializers.ModelSerializer):
    pso_code = serializers.CharField(source='pso.pso_code', read_only=True)

    class Meta:
        model = PSOAttainment
        fields = '__all__'
