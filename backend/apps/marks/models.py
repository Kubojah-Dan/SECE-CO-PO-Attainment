"""
SECE CO-PO Platform — Marks App Models
StudentMark, QuestionCOMapping, StudentQuestionMark, ExcelUploadLog
"""
from django.db import models
from apps.students.models import Student
from apps.allocations.models import SubjectAllocation, AssessmentType, COAssessmentMapping
from apps.subjects.models import CourseOutcome
from apps.authentication.models import User


class StudentMark(models.Model):
    """
    Mark scored by a student in an assessment for a subject allocation.
    This is the primary data table — all attainment calculations derive from here.
    """
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='marks'
    )
    subject_allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name='student_marks'
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name='student_marks'
    )
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    is_absent = models.BooleanField(default=False)
    entered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='entered_marks'
    )
    entered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_mark'
        verbose_name = 'Student Mark'
        unique_together = [['student', 'subject_allocation', 'assessment_type']]
        indexes = [
            models.Index(fields=['student']),
            models.Index(fields=['subject_allocation']),
            models.Index(fields=['assessment_type']),
            models.Index(fields=['subject_allocation', 'assessment_type']),
        ]

    def __str__(self):
        return (
            f"{self.student.roll_number} | "
            f"{self.subject_allocation.subject.subject_code} | "
            f"{self.assessment_type.code}: {self.marks_obtained}/{self.max_marks}"
        )

    @property
    def percentage(self):
        if self.max_marks and self.max_marks > 0:
            return round((self.marks_obtained / self.max_marks) * 100, 2)
        return 0


class QuestionCOMapping(models.Model):
    """
    Maps individual questions in an assessment to COs.
    Used for granular question-wise CO attainment calculation.
    E.g., CIA1 Q1a → CO1 (5 marks), Q1b → CO2 (5 marks)
    """
    subject_allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name='question_co_mappings'
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name='question_mappings'
    )
    question_number = models.CharField(max_length=10)    # "Q1a", "Q1b", "Q2"
    co = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name='question_mappings'
    )
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'question_co_mapping'
        verbose_name = 'Question-CO Mapping'
        unique_together = [['subject_allocation', 'assessment_type', 'question_number']]

    def __str__(self):
        return (
            f"{self.subject_allocation.subject.subject_code} | "
            f"{self.assessment_type.code} | {self.question_number} → {self.co.co_code}"
        )


class StudentQuestionMark(models.Model):
    """
    Marks scored per question (used when question-wise CO mapping is configured).
    """
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='question_marks'
    )
    question_mapping = models.ForeignKey(
        QuestionCOMapping, on_delete=models.CASCADE, related_name='student_marks'
    )
    marks_obtained = models.DecimalField(max_digits=6, decimal_places=2)
    entered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_question_mark'
        verbose_name = 'Student Question Mark'
        unique_together = [['student', 'question_mapping']]

    def __str__(self):
        return (
            f"{self.student.roll_number} | "
            f"{self.question_mapping.question_number}: {self.marks_obtained}"
        )


class ExcelUploadLog(models.Model):
    """
    Tracks every Excel upload: status, errors, records processed.
    Used for upload history view and retry support.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        SUCCESS = 'SUCCESS', 'Success'
        PARTIAL = 'PARTIAL', 'Partial Success'
        FAILED = 'FAILED', 'Failed'

    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='excel_uploads'
    )
    subject_allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name='excel_uploads'
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name='excel_uploads'
    )
    filename = models.CharField(max_length=500)
    file = models.FileField(upload_to='excel_uploads/')
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    records_processed = models.IntegerField(default=0)
    records_total = models.IntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)
    task_id = models.CharField(max_length=100, blank=True)   # Celery task ID
    uploaded_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'excel_upload_log'
        verbose_name = 'Excel Upload Log'
        ordering = ['-uploaded_at']

    def __str__(self):
        return (
            f"{self.filename} | {self.assessment_type.code} | "
            f"{self.status} | {self.uploaded_at.strftime('%Y-%m-%d %H:%M')}"
        )

    def get_max_marks(self):
        """Get max marks for this upload's assessment type and allocation."""
        try:
            config = self.subject_allocation.assessment_configs.get(
                assessment_type=self.assessment_type
            )
            return config.max_marks
        except Exception:
            return self.assessment_type.default_max_marks or 100
