"""
SECE CO-PO Platform — Departments App Models
College → Department → Programme → ProgramOutcome/PSO → Batch → Section
"""
from django.db import models


class Regulation(models.Model):
    """
    Academic regulations (e.g., R2021, R2023).
    Stores dynamic rules for weightages, passing criteria, and assessment patterns.
    """
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    academic_rules = models.JSONField(
        default=dict,
        help_text="JSON mapping for weightages, CIA/ESE rules, and passing criteria."
    )
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'regulation'
        verbose_name = 'Regulation'
        ordering = ['-name']

    def __str__(self):
        return self.name


class College(models.Model):
    """Singleton-ish model for the institution. SECE is the primary college."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to='college/', null=True, blank=True)
    established_year = models.IntegerField(null=True, blank=True)
    accreditation_status = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'college'
        verbose_name = 'College'

    def __str__(self):
        return self.name


class Department(models.Model):
    """
    Academic departments at SECE.
    Pre-seeded with all 11 departments from Research1.md.
    """
    college = models.ForeignKey(
        College, on_delete=models.CASCADE, related_name='departments'
    )
    name = models.CharField(max_length=200)          # Full name
    code = models.CharField(max_length=20)            # "CSE_AIML"
    short_name = models.CharField(max_length=50)      # "CSE(AI&ML)"
    hod_name = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'department'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        unique_together = [['college', 'code']]
        ordering = ['name']

    def __str__(self):
        return self.short_name


class Programme(models.Model):
    """
    Degree programmes offered by a department.
    E.g., B.E. Artificial Intelligence & Machine Learning
    """
    class DegreeType(models.TextChoices):
        UG = 'UG', 'Under Graduate'
        PG = 'PG', 'Post Graduate'

    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='programmes'
    )
    name = models.CharField(max_length=200)
    degree_type = models.CharField(max_length=5, choices=DegreeType.choices, default=DegreeType.UG)
    duration_years = models.IntegerField(default=4)
    total_semesters = models.IntegerField(default=8)
    regulation = models.ForeignKey(
        Regulation, on_delete=models.SET_NULL, null=True, related_name='programmes'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'programme'
        verbose_name = 'Programme'
        verbose_name_plural = 'Programmes'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.degree_type})"


class ProgrammeTemplate(models.Model):
    """
    Reusable templates for programme curriculum and NBA/NAAC configurations.
    """
    programme = models.ForeignKey(
        Programme, on_delete=models.CASCADE, related_name='templates'
    )
    regulation = models.ForeignKey(
        Regulation, on_delete=models.CASCADE, related_name='programme_templates'
    )
    curriculum_structure = models.JSONField(default=list)
    po_customizations = models.JSONField(default=dict)
    pso_customizations = models.JSONField(default=dict)
    attainment_thresholds = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'programme_template'
        verbose_name = 'Programme Template'
        unique_together = [['programme', 'regulation']]

    def __str__(self):
        return f"{self.programme.name} — {self.regulation.name} Template"


class ProgramOutcome(models.Model):
    """
    NBA standard Program Outcomes (PO1–PO12) per programme.
    Same 12 POs for all B.E. programmes (NBA-prescribed).
    """
    class Category(models.TextChoices):
        PO = 'PO', 'Program Outcome'
        PSO = 'PSO', 'Program Specific Outcome'

    programme = models.ForeignKey(
        Programme, on_delete=models.CASCADE, related_name='program_outcomes'
    )
    po_number = models.IntegerField()                # 1 to 12
    po_code = models.CharField(max_length=10)         # "PO1", "PO2"
    description = models.TextField()
    category = models.CharField(max_length=5, choices=Category.choices, default=Category.PO)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'program_outcome'
        verbose_name = 'Program Outcome'
        verbose_name_plural = 'Program Outcomes'
        unique_together = [['programme', 'po_number', 'category']]
        ordering = ['po_number']

    def __str__(self):
        return f"{self.programme.department.short_name} — {self.po_code}"


class ProgramSpecificOutcome(models.Model):
    """
    Program Specific Outcomes (PSOs) — 2–3 per programme.
    Unique to each programme based on specialization.
    """
    programme = models.ForeignKey(
        Programme, on_delete=models.CASCADE, related_name='psos'
    )
    pso_number = models.IntegerField()
    pso_code = models.CharField(max_length=10)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'program_specific_outcome'
        verbose_name = 'Program Specific Outcome'
        unique_together = [['programme', 'pso_number']]
        ordering = ['pso_number']

    def __str__(self):
        return f"{self.programme.department.short_name} — {self.pso_code}"


class Batch(models.Model):
    """
    Academic batch (year range) for a programme.
    E.g., 2021–2025, 2022–2026
    """
    programme = models.ForeignKey(
        Programme, on_delete=models.CASCADE, related_name='batches'
    )
    start_year = models.IntegerField()
    end_year = models.IntegerField()
    regulation = models.ForeignKey(
        Regulation, on_delete=models.SET_NULL, null=True, related_name='batches'
    )
    label = models.CharField(max_length=20)          # "2021-2025"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'batch'
        verbose_name = 'Batch'
        verbose_name_plural = 'Batches'
        unique_together = [['programme', 'start_year']]
        ordering = ['-start_year']

    def __str__(self):
        return f"{self.programme.department.short_name} {self.label}"

    def save(self, *args, **kwargs):
        if not self.label:
            self.label = f"{self.start_year}-{self.end_year}"
        super().save(*args, **kwargs)


class Section(models.Model):
    """
    Sections within a batch. E.g., Section A, B, C.
    Each section is taught as a unit — faculty allocation is per section.
    """
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name='sections'
    )
    name = models.CharField(max_length=10)           # "A", "B", "C"
    strength = models.IntegerField(default=60)       # Expected student count
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'section'
        verbose_name = 'Section'
        unique_together = [['batch', 'name']]
        ordering = ['name']

    def __str__(self):
        return f"{self.batch} — Section {self.name}"

    @property
    def department(self):
        return self.batch.programme.department

    @property
    def programme(self):
        return self.batch.programme
