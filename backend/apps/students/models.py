"""
SECE CO-PO Platform — Students App Models
"""
from django.db import models
from apps.departments.models import Department, Batch, Section


class Student(models.Model):
    """
    Student enrolled in a section/batch.
    Imported via Excel at the start of each academic year by HOD/Admin.
    """
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='students'
    )
    roll_number = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    batch = models.ForeignKey(
        Batch, on_delete=models.CASCADE, related_name='students'
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name='students'
    )
    # For S&H students: the engineering dept they will migrate to in Year 2.
    # Null for regular students who stay in their home department.
    target_department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incoming_students',
        help_text=(
            'For S&H students: the engineering department they will be '
            'transferred to at the start of their second year.'
        )
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student'
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        ordering = ['roll_number']
        indexes = [
            models.Index(fields=['roll_number']),
            models.Index(fields=['section']),
            models.Index(fields=['batch', 'section']),
        ]

    def __str__(self):
        return f"{self.roll_number} — {self.name}"
