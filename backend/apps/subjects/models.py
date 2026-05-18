"""
SECE CO-PO Platform — Subjects App Models
AcademicYear, Subject, CourseOutcome, CO-PO/PSO Mappings
"""
from django.db import models
from apps.departments.models import Department, Programme, ProgramOutcome, ProgramSpecificOutcome, Regulation


class AcademicYear(models.Model):
    """
    Academic year tracking. E.g., "2024-25".
    Only one can be current at a time (enforced via signal).
    """
    label = models.CharField(max_length=20, unique=True)    # "2024-25"
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academic_year'
        verbose_name = 'Academic Year'
        ordering = ['-label']

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        # Ensure only one academic year is current
        if self.is_current:
            AcademicYear.objects.filter(is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Subject(models.Model):
    """
    Subject/Course master list.
    Each subject belongs to a department and has a semester.
    """
    class SubjectType(models.TextChoices):
        THEORY = 'THEORY', 'Theory'
        LAB = 'LAB', 'Laboratory'
        INTEGRATED = 'INTEGRATED', 'Theory + Lab'
        PROJECT = 'PROJECT', 'Project'
        ELECTIVE = 'ELECTIVE', 'Elective'
        AUDIT = 'AUDIT', 'Audit Course'

    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='subjects'
    )
    subject_code = models.CharField(max_length=30, unique=True)
    subject_name = models.CharField(max_length=300)
    semester = models.IntegerField()                     # 1 to 8
    credits = models.IntegerField(default=3)
    subject_type = models.CharField(
        max_length=30, choices=SubjectType.choices, default=SubjectType.THEORY
    )
    lecture_hours = models.IntegerField(default=3)
    tutorial_hours = models.IntegerField(default=0)
    practical_hours = models.IntegerField(default=0)
    regulation = models.ForeignKey(
        Regulation, on_delete=models.SET_NULL, null=True, related_name='subjects'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subject'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['semester', 'subject_code']
        indexes = [
            models.Index(fields=['subject_code']),
            models.Index(fields=['department', 'semester']),
        ]

    def __str__(self):
        return f"{self.subject_code} — {self.subject_name}"


class CourseOutcome(models.Model):
    """
    Course Outcomes (COs) for a subject.
    Faculty defines 5–6 COs per subject with Bloom's taxonomy levels.
    """
    class BloomLevel(models.TextChoices):
        REMEMBER = 'Remember', 'Remember (L1)'
        UNDERSTAND = 'Understand', 'Understand (L2)'
        APPLY = 'Apply', 'Apply (L3)'
        ANALYZE = 'Analyze', 'Analyze (L4)'
        EVALUATE = 'Evaluate', 'Evaluate (L5)'
        CREATE = 'Create', 'Create (L6)'

    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='course_outcomes'
    )
    co_number = models.IntegerField()                    # 1, 2, 3, 4, 5
    co_code = models.CharField(max_length=20)            # "CO1", "CO2"
    description = models.TextField()
    bloom_level = models.CharField(
        max_length=20, choices=BloomLevel.choices, default=BloomLevel.APPLY
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_outcome'
        verbose_name = 'Course Outcome'
        unique_together = [['subject', 'co_number']]
        ordering = ['co_number']

    def __str__(self):
        return f"{self.subject.subject_code} — {self.co_code}"

    def save(self, *args, **kwargs):
        if not self.co_code:
            self.co_code = f"CO{self.co_number}"
        super().save(*args, **kwargs)


class COPOMapping(models.Model):
    """
    CO-to-PO mapping with correlation strength (1=Low, 2=Medium, 3=High).
    The foundation of the PO attainment calculation.
    """
    CORRELATION_CHOICES = [(1, '1 — Low'), (2, '2 — Medium'), (3, '3 — High')]

    co = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name='po_mappings'
    )
    po = models.ForeignKey(
        ProgramOutcome, on_delete=models.CASCADE, related_name='co_mappings'
    )
    correlation_level = models.IntegerField(choices=CORRELATION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'co_po_mapping'
        verbose_name = 'CO-PO Mapping'
        unique_together = [['co', 'po']]
        indexes = [
            models.Index(fields=['co']),
            models.Index(fields=['po']),
        ]

    def __str__(self):
        return f"{self.co.co_code} → {self.po.po_code} (Level {self.correlation_level})"


class COPSOMapping(models.Model):
    """CO-to-PSO mapping with correlation strength."""
    CORRELATION_CHOICES = [(1, '1 — Low'), (2, '2 — Medium'), (3, '3 — High')]

    co = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name='pso_mappings'
    )
    pso = models.ForeignKey(
        ProgramSpecificOutcome, on_delete=models.CASCADE, related_name='co_mappings'
    )
    correlation_level = models.IntegerField(choices=CORRELATION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'co_pso_mapping'
        verbose_name = 'CO-PSO Mapping'
        unique_together = [['co', 'pso']]

    def __str__(self):
        return f"{self.co.co_code} → {self.pso.pso_code} (Level {self.correlation_level})"


class LabComponent(models.Model):
    """Components of a lab subject evaluation (e.g., Record, Viva)."""
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='lab_components'
    )
    name = models.CharField(max_length=100)
    max_marks = models.IntegerField(default=10)
    weightage = models.IntegerField(default=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lab_component'
        unique_together = [['subject', 'name']]

    def __str__(self):
        return f"{self.subject.subject_code} — {self.name}"


class Experiment(models.Model):
    """Individual experiments in a laboratory course."""
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name='experiments'
    )
    exp_number = models.IntegerField()
    name = models.CharField(max_length=255)
    mapped_cos = models.ManyToManyField(
        CourseOutcome, related_name='experiments', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'experiment'
        ordering = ['exp_number']
        unique_together = [['subject', 'exp_number']]

    def __str__(self):
        return f"Exp {self.exp_number}: {self.name}"
