"""SECE CO-PO Platform — Authentication Serializers"""
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from .models import User, StaffProfile


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer — used in responses."""
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    dashboard_url = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'first_name', 'last_name', 'full_name',
            'phone', 'is_active', 'date_joined', 'last_login',
            'profile_photo', 'department_name', 'department_id', 'dashboard_url',
            'employee_id'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'dashboard_url', 'employee_id']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_department_name(self, obj):
        dept = obj.department
        return dept.name if dept else None

    def get_department_id(self, obj):
        try:
            dept = obj.department
            return dept.id if dept else None
        except Exception:
            return None

    def get_dashboard_url(self, obj):
        return obj.get_dashboard_url()

    def get_employee_id(self, obj):
        try:
            if hasattr(obj, 'faculty_profile') and obj.faculty_profile:
                return obj.faculty_profile.employee_id
            if hasattr(obj, 'hod_profile') and obj.hod_profile:
                return obj.hod_profile.employee_id
            if hasattr(obj, 'staff_profile') and obj.staff_profile:
                return obj.staff_profile.employee_id
        except Exception:
            pass
        return None


class LoginSerializer(serializers.Serializer):
    """Login with email + password."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password', '')

        if not email or not password:
            raise serializers.ValidationError('Email and password are required.')

        user = authenticate(request=self.context.get('request'), email=email, password=password)

        if not user:
            raise serializers.ValidationError(
                'Invalid credentials. Please check your email and password.',
                code='authentication'
            )

        if not user.is_active:
            raise serializers.ValidationError(
                'Your account has been deactivated. Contact the administrator.',
                code='inactive'
            )

        attrs['user'] = user
        return attrs


class LoginResponseSerializer(serializers.Serializer):
    """Response shape after successful login."""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class ChangePasswordSerializer(serializers.Serializer):
    """Change password for authenticated user."""
    old_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(attrs['new_password'], self.context['request'].user)
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class UserCreateSerializer(serializers.ModelSerializer):
    """Admin creates a new user with initial password."""
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = [
            'email', 'role', 'first_name', 'last_name', 'phone',
            'password', 'confirm_password'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Update user info (admin or self)."""
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_photo', 'is_active', 'password']


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        validate_password(attrs['new_password'])
        return attrs


class StaffProfileSerializer(serializers.ModelSerializer):
    """Serializes StaffProfile with department details."""
    department_details = serializers.SerializerMethodField()

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'employee_id',
            'departments', 'department_details',
            'created_at', 'updated_at',
        ]

    def get_department_details(self, obj):
        return [
            {'id': d.id, 'name': d.name, 'short_name': getattr(d, 'short_name', '')}
            for d in obj.departments.all()
        ]


class CreateStaffUserSerializer(serializers.Serializer):
    """
    Admin-only: create a User with role='staff' and its StaffProfile atomically.
    Validates uniqueness of email and employee_id before creating anything.
    """
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    employee_id = serializers.CharField(max_length=20)
    password = serializers.CharField(min_length=8, write_only=True)
    department_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'A user with this email already exists.'
            )
        return value.lower().strip()

    def validate_employee_id(self, value):
        if StaffProfile.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError(
                'This employee ID is already in use.'
            )
        return value

    def validate_department_ids(self, value):
        from apps.departments.models import Department
        existing_ids = list(
            Department.objects.filter(id__in=value).values_list('id', flat=True)
        )
        missing = set(value) - set(existing_ids)
        if missing:
            raise serializers.ValidationError(
                f'Departments not found: {sorted(missing)}'
            )
        return value

    def create(self, validated_data):
        from apps.departments.models import Department
        department_ids = validated_data.pop('department_ids')
        password = validated_data.pop('password')
        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data['email'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                password=password,
                role='staff',
            )
            profile = StaffProfile.objects.create(
                user=user,
                employee_id=validated_data['employee_id'],
            )
            profile.departments.set(department_ids)
        return user
