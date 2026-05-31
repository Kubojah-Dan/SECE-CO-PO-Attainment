"""SECE CO-PO Platform — Authentication Serializers"""
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer — used in responses."""
    full_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    dashboard_url = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    # HR Staff flag: True when faculty_profile.is_hr_staff == True
    is_hr_staff = serializers.SerializerMethodField()
    # HR departments M2M (list of dept IDs — only populated for HR staff)
    hr_department_ids = serializers.SerializerMethodField()
    faculty_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'first_name', 'last_name', 'full_name',
            'phone', 'is_active', 'date_joined', 'last_login',
            'profile_photo', 'department_name', 'department_id', 'dashboard_url',
            'employee_id', 'is_hr_staff', 'hr_department_ids', 'faculty_profile',
        ]
        read_only_fields = [
            'id', 'date_joined', 'last_login', 'dashboard_url',
            'employee_id', 'is_hr_staff', 'hr_department_ids',
        ]

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
        except Exception:
            pass
        return None

    def get_is_hr_staff(self, obj):
        try:
            return bool(
                obj.role == 'faculty'
                and hasattr(obj, 'faculty_profile')
                and obj.faculty_profile.is_hr_staff
            )
        except Exception:
            return False

    def get_hr_department_ids(self, obj):
        try:
            if obj.role == 'faculty' and hasattr(obj, 'faculty_profile'):
                fp = obj.faculty_profile
                if fp.is_hr_staff:
                    return list(fp.departments.values_list('id', flat=True))
        except Exception:
            pass
        return []

    def get_faculty_profile(self, obj):
        try:
            if obj.role == 'faculty' and hasattr(obj, 'faculty_profile'):
                fp = obj.faculty_profile
                return {
                    'id': fp.id,
                    'department': fp.department_id,
                    'employee_id': fp.employee_id,
                    'designation': fp.designation,
                    'is_hr_staff': fp.is_hr_staff,
                    'departments': list(fp.departments.values_list('id', flat=True)),
                }
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
