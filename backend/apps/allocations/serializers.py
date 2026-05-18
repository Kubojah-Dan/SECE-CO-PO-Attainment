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
    student_count = serializers.SerializerMethodField()
    marks_completion_pct = serializers.SerializerMethodField()
    has_attainment = serializers.SerializerMethodField()

    class Meta:
        model = SubjectAllocation
        fields = [
            'id', 'subject', 'faculty', 'section', 'academic_year', 
            'subject_code', 'subject_name', 'section_name', 'batch_label', 'semester', 'faculty_name',
            'approval_status', 'hod_remarks', 'is_active', 'created_at', 'updated_at',
            'course_outcomes', 'student_count', 'marks_completion_pct', 'has_attainment'
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


class SubjectAssessmentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectAssessmentConfig
        fields = '__all__'


class COAssessmentMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = COAssessmentMapping
        fields = '__all__'
