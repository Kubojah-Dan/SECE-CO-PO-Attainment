from rest_framework import serializers
from .models import (
    AssessmentType, SubjectAllocation, SubjectAssessmentConfig, COAssessmentMapping
)
from apps.subjects.serializers import CourseOutcomeSerializer


class AssessmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentType
        fields = '__all__'


class SubjectAllocationSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source='subject.subject_code', read_only=True)
    subject_name = serializers.CharField(source='subject.subject_name', read_only=True)
    section_name = serializers.CharField(source='section.name', read_only=True)
    batch_label = serializers.CharField(source='section.batch.label', read_only=True)
    faculty_name = serializers.CharField(source='faculty.user.get_full_name', read_only=True)
    semester = serializers.IntegerField(source='subject.semester', read_only=True)
    course_outcomes = CourseOutcomeSerializer(source='subject.course_outcomes', many=True, read_only=True)
    programme_id = serializers.IntegerField(source='section.batch.programme.id', read_only=True)
    student_count = serializers.SerializerMethodField()
    marks_completion_pct = serializers.SerializerMethodField()
    has_attainment = serializers.SerializerMethodField()
    overall_attainment = serializers.SerializerMethodField()
    marks_status = serializers.SerializerMethodField()
    co_attainments = serializers.SerializerMethodField()

    class Meta:
        model = SubjectAllocation
        fields = [
            'id', 'subject', 'faculty', 'section', 'academic_year', 
            'subject_code', 'subject_name', 'section_name', 'batch_label', 'semester', 'faculty_name',
            'approval_status', 'hod_remarks', 'is_active', 'created_at', 'updated_at',
            'course_outcomes', 'student_count', 'marks_completion_pct', 'has_attainment', 'programme_id',
            'overall_attainment', 'marks_status', 'co_attainments'
        ]

    def get_student_count(self, obj):
        from apps.students.models import Student
        return Student.objects.filter(section=obj.section, is_active=True).count()

    def get_marks_completion_pct(self, obj):
        from apps.students.models import Student
        from apps.marks.models import StudentMark
        total_students = Student.objects.filter(section=obj.section, is_active=True).count()
        if total_students == 0:
            return 0
        configs = SubjectAssessmentConfig.objects.filter(subject_allocation=obj, is_enabled=True)
        if not configs.exists():
            return 0
        entered_assessments = 0
        for config in configs:
            if StudentMark.objects.filter(subject_allocation=obj, assessment_type=config.assessment_type).exists():
                entered_assessments += 1
        return int((entered_assessments / configs.count()) * 100)

    def get_has_attainment(self, obj):
        from apps.attainment.models import COAttainment
        return COAttainment.objects.filter(subject_allocation=obj).exists()

    def get_overall_attainment(self, obj):
        from apps.attainment.models import COAttainment
        from django.db.models import Avg
        avg = COAttainment.objects.filter(subject_allocation=obj).aggregate(Avg('final_attainment'))['final_attainment__avg']
        return float(avg) if avg else 0.0

    def get_marks_status(self, obj):
        from apps.marks.models import StudentMark
        from apps.students.models import Student
        total_students = Student.objects.filter(section=obj.section, is_active=True).count()
        configs = SubjectAssessmentConfig.objects.filter(subject_allocation=obj, is_enabled=True)
        status_dict = {}
        for config in configs:
            code = config.assessment_type.code
            marks_count = StudentMark.objects.filter(subject_allocation=obj, assessment_type=config.assessment_type).count()
            if marks_count == 0:
                status_dict[code] = 'pending'
            elif marks_count >= total_students and total_students > 0:
                status_dict[code] = 'complete'
            else:
                status_dict[code] = 'partial'
        return status_dict

    def get_co_attainments(self, obj):
        from apps.attainment.models import COAttainment
        attainments = COAttainment.objects.filter(subject_allocation=obj).order_by('co__co_number')
        return [{
            'co_code': att.co.co_code,
            'attainment_level': att.attainment_level,
            'final_attainment': float(att.final_attainment or 0)
        } for att in attainments]


class SubjectAssessmentConfigSerializer(serializers.ModelSerializer):
    assessment_type_code = serializers.CharField(source='assessment_type.code', read_only=True)
    assessment_type_name = serializers.CharField(source='assessment_type.name', read_only=True)
    assessment_type_category = serializers.CharField(source='assessment_type.category', read_only=True)
    threshold_pct = serializers.SerializerMethodField()
    effective_weightage = serializers.SerializerMethodField()

    class Meta:
        model = SubjectAssessmentConfig
        fields = '__all__'

    def get_threshold_pct(self, obj):
        if obj.max_marks and obj.passing_marks:
            return round(float(obj.passing_marks) / float(obj.max_marks) * 100)
        return 50

    def get_effective_weightage(self, obj):
        if obj.weightage is not None:
            return obj.weightage
        return obj.assessment_type.weightage_percent


class COAssessmentMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = COAssessmentMapping
        fields = '__all__'
