"""
SECE CO-PO Platform — Allocations App Models
SubjectAllocation, AssessmentType, SubjectAssessmentConfig, COAssessmentMapping
"""
from django.db import models
from apps.subjects.models import Subject, AcademicYear, CourseOutcome
from apps.departments.models import Section
from apps.users.models import FacultyProfile


class SubjectAllocation(models.Model):
    """
    Maps a subject to a faculty member for a specific section and academic year.
    This is the central entity linking subjects, faculty, students, and marks.
    """
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='allocations'
    )
    faculty = models.ForeignKey(
        FacultyProfile, on_delete=models.CASCADE, related_name='allocations'
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name='allocations'
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE, related_name='allocations'
    )
    class ApprovalStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    approval_status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING
    )
    hod_remarks = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subject_allocation'
        verbose_name = 'Subject Allocation'
        unique_together = [['subject', 'section', 'academic_year']]
        indexes = [
            models.Index(fields=['faculty']),
            models.Index(fields=['section', 'academic_year']),
        ]

    def __str__(self):
        return (
            f"{self.subject.subject_code} → {self.faculty.user.get_full_name()} "
            f"| {self.section} | {self.academic_year}"
        )

    @property
    def department(self):
        return self.subject.department

    @property
    def semester(self):
        return self.subject.semester


class AssessmentType(models.Model):
    """
    Standard assessment types used across all subjects.
    Pre-seeded: CIA1, CIA2, CIA3, ESE, QUIZ, ASSIGN, PROJ_R1-R3, PROJ_FINAL, PRESENTATION.
    """
    class Category(models.TextChoices):
        INTERNAL = 'INTERNAL', 'Internal Assessment'
        EXTERNAL = 'EXTERNAL', 'External Assessment'
        CONTINUOUS = 'CONTINUOUS', 'Continuous Assessment'
        PROJECT = 'PROJECT', 'Project Assessment'

    code = models.CharField(max_length=30, unique=True)        # "CIA1", "ESE"
    name = models.CharField(max_length=100)                     # "CIA 1"
    category = models.CharField(max_length=20, choices=Category.choices)
    default_max_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True)
    weightage_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    display_order = models.IntegerField(default=0)
    is_system = models.BooleanField(default=False)             # System-defined types are seeded; custom ones are not

    class Meta:
        db_table = 'assessment_type'
        verbose_name = 'Assessment Type'
        ordering = ['display_order', 'code']

    def __str__(self):
        return f"{self.name} ({self.code})"


class SubjectAssessmentConfig(models.Model):
    """
    Per-allocation configuration: which assessments are enabled for a subject,
    and what are the custom max marks.
    """
    subject_allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name='assessment_configs'
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name='subject_configs'
    )
    is_enabled = models.BooleanField(default=True)
    max_marks = models.DecimalField(max_digits=6, decimal_places=2)
    passing_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    # Per-allocation override weightage; if null, falls back to assessment_type.weightage_percent
    weightage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def threshold_pct(self):
        """Passing threshold as a percentage of max marks."""
        if self.max_marks and self.passing_marks:
            return round(float(self.passing_marks) / float(self.max_marks) * 100)
        return 50

    @property
    def effective_weightage(self):
        """Weightage to use — per-allocation override or global type default."""
        if self.weightage is not None:
            return self.weightage
        return self.assessment_type.weightage_percent

    def save(self, *args, **kwargs):
        from decimal import Decimal
        if self.max_marks is not None:
            self.passing_marks = self.max_marks * Decimal('0.5')
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'subject_assessment_config'
        verbose_name = 'Assessment Configuration'
        unique_together = [['subject_allocation', 'assessment_type']]

    def __str__(self):
        status = "✓" if self.is_enabled else "✗"
        return f"{status} {self.assessment_type.name} — {self.subject_allocation}"


class COAssessmentMapping(models.Model):
    """
    Maps which COs are tested in which assessment, with coverage weightage.
    E.g., CIA1 covers CO1 (60%) and CO2 (40%).
    Used for granular CO attainment calculation.
    """
    co = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name='assessment_mappings'
    )
    assessment_type = models.ForeignKey(
        AssessmentType, on_delete=models.CASCADE, related_name='co_mappings'
    )
    subject_allocation = models.ForeignKey(
        SubjectAllocation, on_delete=models.CASCADE, related_name='co_assessment_mappings'
    )
    weightage = models.DecimalField(
        max_digits=5, decimal_places=2, default=100.00,
        help_text="Percentage of this assessment covering this CO"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'co_assessment_mapping'
        verbose_name = 'CO-Assessment Mapping'

    def __str__(self):
        return f"{self.co.co_code} ↔ {self.assessment_type.code} ({self.weightage}%)"


from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal

@receiver(post_save, sender=SubjectAllocation)
def initialize_assessment_configs(sender, instance, created, **kwargs):
    if created:
        for at in AssessmentType.objects.all():
            max_val = at.default_max_marks or Decimal('100.00')
            SubjectAssessmentConfig.objects.get_or_create(
                subject_allocation=instance,
                assessment_type=at,
                defaults={
                    'is_enabled': True,
                    'max_marks': max_val,
                    'passing_marks': max_val * Decimal('0.5')
                }
            )

@receiver(post_save, sender=SubjectAssessmentConfig)
def initialize_co_assessment_mappings(sender, instance, created, **kwargs):
    if created:
        from apps.subjects.models import CourseOutcome
        # Check if mappings already exist for this allocation and assessment type
        existing_mappings = COAssessmentMapping.objects.filter(
            subject_allocation=instance.subject_allocation,
            assessment_type=instance.assessment_type
        )
        if not existing_mappings.exists():
            cos = list(CourseOutcome.objects.filter(subject=instance.subject_allocation.subject).order_by('co_number'))
            if not cos:
                # Auto create default 5 COs if not present
                for i in range(1, 6):
                    co, _ = CourseOutcome.objects.get_or_create(
                        subject=instance.subject_allocation.subject,
                        co_number=i,
                        defaults={
                            'co_code': f'CO{i}',
                            'description': f'Understand and apply concepts of Course Outcome {i}',
                            'bloom_level': 'Apply'
                        }
                    )
                    cos.append(co)
            
            eq_weight = Decimal('100.00') / Decimal(str(len(cos)))
            mappings = [
                COAssessmentMapping(
                    co=co,
                    assessment_type=instance.assessment_type,
                    subject_allocation=instance.subject_allocation,
                    weightage=eq_weight
                ) for co in cos
            ]
            COAssessmentMapping.objects.bulk_create(mappings)
