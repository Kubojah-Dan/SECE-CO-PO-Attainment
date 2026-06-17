"""
SECE CO-PO Platform — Users App Models
FacultyProfile, HODProfile, IQACProfile extending the central User model.
"""
from django.db import models
from apps.authentication.models import User
from apps.departments.models import Department


class FacultyProfile(models.Model):
    """Extended profile for Faculty role users."""

    class Designation(models.TextChoices):
        AP = 'Assistant Professor', 'Assistant Professor'
        APSG = 'Assistant Professor (Senior Grade)', 'Assistant Professor (Senior Grade)'
        ASP = 'Associate Professor', 'Associate Professor'
        PROF = 'Professor', 'Professor'
        HPOF = 'Professor & Head', 'Professor & Head'

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='faculty_profile'
    )
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, related_name='faculty_members'
    )
    employee_id = models.CharField(max_length=50, unique=True)
    designation = models.CharField(
        max_length=100, choices=Designation.choices, default=Designation.AP
    )
    qualification = models.CharField(max_length=200, blank=True)
    experience_years = models.IntegerField(default=0)
    specialization = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    joined_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'faculty_profile'
        verbose_name = 'Faculty Profile'

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.department.short_name if self.department else 'No Dept'}"


class HODProfile(models.Model):
    """Extended profile for HOD role users."""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='hod_profile'
    )
    department = models.OneToOneField(
        Department, on_delete=models.SET_NULL, null=True, related_name='hod_profile'
    )
    employee_id = models.CharField(max_length=50, blank=True)
    designation = models.CharField(max_length=100, default='Head of Department')
    since_year = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hod_profile'
        verbose_name = 'HOD Profile'

    def __str__(self):
        dept_name = self.department.short_name if self.department else 'No Dept'
        return f"HOD: {self.user.get_full_name()} — {dept_name}"


class IQACProfile(models.Model):
    """Extended profile for IQAC role users."""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='iqac_profile'
    )
    designation = models.CharField(max_length=100, default='IQAC Coordinator')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'iqac_profile'
        verbose_name = 'IQAC Profile'

    def __str__(self):
        return f"IQAC: {self.user.get_full_name()}"
