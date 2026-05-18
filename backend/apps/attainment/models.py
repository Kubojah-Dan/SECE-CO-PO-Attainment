"""
SECE CO-PO Platform — Attainment App Models
COAttainment, POAttainment, PSOAttainment, AttainmentConfig
"""
from django.db import models
from apps.subjects.models import CourseOutcome
from apps.departments.models import (
    ProgramOutcome, ProgramSpecificOutcome, Section, Programme
)
from apps.allocations.models import SubjectAllocation
from apps.subjects.models import AcademicYear


class AttainmentConfig(models.Model):
    """
    Configurable thresholds for attainment calculation.
    Can be set per department or globally.
    Admin can override defaults from Research1.md.
    """
    department = models.OneToOneField(
        'departments.Department', on_delete=models.CASCADE,
        null=True, blank=True, related_name='attainment_config'
    )
    # If department is NULL, this is the global default config

    # Marks threshold: student must score >= X% of max marks to "attain" a CO
    threshold_marks_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=60.00,
        help_text="% of max marks a student must score to attain a CO"
    )

    # Student pass rate thresholds for level determination
    level3_student_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=70.00,
        help_text="% of students that must attain for Level 3"
    )
    level2_student_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=60.00,
        help_text="% of students that must attain for Level 2"
    )
    level1_student_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=50.00,
        help_text="% of students that must attain for Level 1"
    )

    # Direct vs Indirect attainment weightage
    direct_weightage = models.DecimalField(
        max_digits=5, decimal_places=2, default=80.00,
        help_text="Weight of direct attainment in final CO attainment"
    )
    indirect_weightage = models.DecimalField(
        max_digits=5, decimal_places=2, default=20.00,
        help_text="Weight of indirect (survey) attainment in final CO attainment"
    )

    # Target CO attainment level (typically Level 2 = 60%)
    target_co_level = models.IntegerField(default=2)
    target_po_attainment = models.DecimalField(max_digits=5, decimal_places=2, default=60.00)

    # CIA best-of configuration
    cia_best_of = models.IntegerField(default=2, help_text="Take best N out of 3 CIAs")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attainment_config'
        verbose_name = 'Attainment Configuration'

    def __str__(self):
        if self.department:
            return f"Config: {self.department.short_name}"
        return "Config: Global Default"


class COAttainment(models.Model):
    """
    Computed CO attainment result for a CO within a subject allocation.
    Updated every time marks are saved or recalculation is triggered.
    """
    co = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name='attainments'
    )
    subject_allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name='co_attainments'
    )

    # Attainment metrics
    students_attained = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    attainment_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True,
        help_text="% of students who attained the CO"
    )

    # Computed attainment values
    direct_attainment = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    indirect_attainment = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    final_attainment = models.DecimalField(max_digits=5, decimal_places=2, null=True)

    # Level (0, 1, 2, 3)
    attainment_level = models.IntegerField(null=True)
    target_attainment = models.DecimalField(max_digits=5, decimal_places=2, default=60.00)
    target_achieved = models.BooleanField(null=True)

    # Metadata
    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'co_attainment'
        verbose_name = 'CO Attainment'
        unique_together = [['co', 'subject_allocation']]
        indexes = [
            models.Index(fields=['co']),
            models.Index(fields=['subject_allocation']),
        ]

    def __str__(self):
        return (
            f"{self.co.co_code} | {self.subject_allocation.subject.subject_code} "
            f"→ L{self.attainment_level} ({self.attainment_percentage}%)"
        )


class POAttainment(models.Model):
    """
    Computed PO attainment for a programme outcome in a section/academic year.
    Aggregated from CO attainments via CO-PO mapping correlation weights.
    """
    po = models.ForeignKey(
        ProgramOutcome, on_delete=models.CASCADE, related_name='attainments'
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name='po_attainments'
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name='po_attainments'
    )
    semester = models.IntegerField(null=True)

    attainment_value = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    attainment_level = models.IntegerField(null=True)
    target_attainment = models.DecimalField(max_digits=5, decimal_places=2, default=60.00)
    target_achieved = models.BooleanField(null=True)
    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'po_attainment'
        verbose_name = 'PO Attainment'
        indexes = [
            models.Index(fields=['po']),
            models.Index(fields=['section', 'academic_year']),
        ]

    def __str__(self):
        return (
            f"{self.po.po_code} | {self.section} | {self.academic_year} "
            f"→ {self.attainment_value}"
        )


class PSOAttainment(models.Model):
    """Computed PSO attainment for a programme specific outcome."""
    pso = models.ForeignKey(
        ProgramSpecificOutcome, on_delete=models.CASCADE, related_name='attainments'
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name='pso_attainments'
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name='pso_attainments'
    )
    attainment_value = models.DecimalField(max_digits=5, decimal_places=2, null=True)
    attainment_level = models.IntegerField(null=True)
    calculated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pso_attainment'
        verbose_name = 'PSO Attainment'

    def __str__(self):
        return f"{self.pso.pso_code} | {self.section} | {self.academic_year} → {self.attainment_value}"


class ActionTakenReport(models.Model):
    """
    Action Taken Report (ATR) for closing the loop on low attainment.
    Faculty proposes actions, HOD reviews, and effectiveness is tracked.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted for Review'
        REVIEWED = 'REVIEWED', 'Reviewed'
        IMPLEMENTED = 'IMPLEMENTED', 'Implemented'
        EFFECTIVE = 'EFFECTIVE', 'Proved Effective'

    subject_allocation = models.OneToOneField(
        SubjectAllocation, on_delete=models.CASCADE, related_name='atr'
    )
    low_performing_cos = models.JSONField(
        default=list, help_text="List of CO numbers that were below target"
    )
    root_cause = models.TextField(help_text="Reason for low attainment")
    proposed_actions = models.TextField(help_text="Corrective measures to be taken")
    action_type = models.CharField(max_length=100, blank=True, help_text="Remedial, Content Beyond Syllabus, etc.")
    implementation_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    hod_remarks = models.TextField(blank=True)
    effectiveness_score = models.IntegerField(
        null=True, blank=True, help_text="Score 1-5 on how effective the actions were in next cycle"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'action_taken_report'
        verbose_name = 'Action Taken Report'

    def __str__(self):
        return f"ATR: {self.subject_allocation.subject.subject_code} — {self.implementation_status}"

class CourseExitSurvey(models.Model):
    """
    Survey configuration for a subject allocation.
    Faculty enables this to collect student feedback on CO achievement.
    """
    subject_allocation = models.OneToOneField(
        SubjectAllocation, on_delete=models.CASCADE, related_name='exit_survey'
    )
    is_active = models.BooleanField(default=False)
    target_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=70.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_exit_survey'
        verbose_name = 'Course Exit Survey'

    def __str__(self):
        return f"Exit Survey: {self.subject_allocation}"


class SurveyResponse(models.Model):
    """
    Individual student responses to a Course Exit Survey.
    Students rate their achievement level for each CO (1-3).
    """
    survey = models.ForeignKey(CourseExitSurvey, on_delete=models.CASCADE, related_name='responses')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    co = models.ForeignKey(CourseOutcome, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(1, '1 — Low'), (2, '2 — Medium'), (3, '3 — High')])
    comments = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'survey_response'
        unique_together = [['survey', 'student', 'co']]

    def __str__(self):
        return f"Response: {self.student.roll_number} - {self.co.co_code}"
