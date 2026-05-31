"""
SECE CO-PO Platform — Custom User Model
Role-based authentication: admin, hod, faculty, iqac
HR Staff are a sub-tier of faculty (is_hr_staff flag on FacultyProfile).
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager using email as the unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Central user model for the SECE CO-PO platform.
    All four roles (admin, hod, faculty, iqac) share this model.
    Role-specific data is stored in separate profile models.
    HR Staff are faculty members with FacultyProfile.is_hr_staff = True.
    """

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Super Admin'
        HOD = 'hod', 'HOD / Department Admin'
        FACULTY = 'faculty', 'Faculty'
        IQAC = 'iqac', 'IQAC'

    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FACULTY)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    # Profile photo
    profile_photo = models.ImageField(
        upload_to='profile_photos/', null=True, blank=True
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.get_full_name()} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_hod(self):
        return self.role == self.Role.HOD

    @property
    def is_faculty(self):
        return self.role == self.Role.FACULTY

    @property
    def is_iqac(self):
        return self.role == self.Role.IQAC

    @property
    def is_hr_staff(self):
        """True when this faculty user is flagged as an HR mark-entry operator."""
        if self.role != self.Role.FACULTY:
            return False
        try:
            return bool(self.faculty_profile.is_hr_staff)
        except Exception:
            return False

    @property
    def department(self):
        """Get department for HOD or Faculty."""
        if self.is_hod:
            try:
                return self.hod_profile.department
            except Exception:
                return None
        elif self.is_faculty:
            try:
                return self.faculty_profile.department
            except Exception:
                return None
        return None

    def get_dashboard_url(self):
        """Return role-appropriate dashboard URL."""
        dashboards = {
            self.Role.ADMIN: '/admin/dashboard',
            self.Role.HOD: '/hod/dashboard',
            self.Role.FACULTY: '/faculty/dashboard',
            self.Role.IQAC: '/iqac/dashboard',
        }
        return dashboards.get(self.role, '/dashboard')


class PasswordResetToken(models.Model):
    """Secure password reset tokens."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = 'password_reset_tokens'

    def is_valid(self):
        from datetime import timedelta
        expiry = self.created_at + timedelta(hours=2)
        return not self.is_used and timezone.now() < expiry
