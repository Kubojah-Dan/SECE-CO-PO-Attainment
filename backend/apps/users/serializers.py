from rest_framework import serializers
from django.db import transaction
from apps.authentication.models import User
from .models import FacultyProfile, HODProfile, IQACProfile


class FacultyProfileSerializer(serializers.ModelSerializer):
    allocations_count = serializers.SerializerMethodField()
    department_details = serializers.SerializerMethodField()

    class Meta:
        model = FacultyProfile
        fields = [
            'id', 'department', 'department_details',
            'employee_id', 'designation', 'qualification',
            'experience_years', 'specialization', 'joined_date',
            'allocations_count',
        ]

    def get_allocations_count(self, obj):
        request = self.context.get('request')
        if request:
            ay = request.query_params.get('academic_year')
            if ay:
                return obj.allocations.filter(is_active=True, academic_year_id=ay).count()
        return obj.allocations.filter(is_active=True).count()

    def get_department_details(self, obj):
        if obj.department:
            return {
                'id': obj.department.id,
                'name': obj.department.name,
                'short_name': getattr(obj.department, 'short_name', ''),
            }
        return None


class HODProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HODProfile
        fields = ['department', 'employee_id', 'designation', 'since_year']


class IQACProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = IQACProfile
        fields = ['designation']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    faculty_profile = FacultyProfileSerializer(required=False)
    hod_profile = HODProfileSerializer(required=False)
    iqac_profile = IQACProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=False)
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'role', 'first_name', 'last_name', 'phone',
            'is_active', 'is_online', 'profile_photo', 'password',
            'faculty_profile', 'hod_profile', 'iqac_profile',
        ]
        read_only_fields = ['id']

    def get_is_online(self, obj):
        from django.core.cache import cache
        return cache.get(f"user_online_{obj.id}", False)

    @transaction.atomic
    def create(self, validated_data):
        faculty_data = validated_data.pop('faculty_profile', None)
        hod_data = validated_data.pop('hod_profile', None)
        iqac_data = validated_data.pop('iqac_profile', None)
        password = validated_data.pop('password', None)

        user = User.objects.create_user(**validated_data)

        if password:
            user.set_password(password)
        else:
            user.set_password("sece@123")
        user.save()

        if user.role == User.Role.FACULTY and faculty_data:
            FacultyProfile.objects.create(user=user, **faculty_data)
        elif user.role == User.Role.HOD and hod_data:
            HODProfile.objects.create(user=user, **hod_data)
        elif user.role == User.Role.IQAC and iqac_data:
            IQACProfile.objects.create(user=user, **iqac_data)

        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        faculty_data = validated_data.pop('faculty_profile', None)
        hod_data = validated_data.pop('hod_profile', None)
        iqac_data = validated_data.pop('iqac_profile', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        if instance.role == User.Role.FACULTY and faculty_data:
            profile, _ = FacultyProfile.objects.get_or_create(user=instance)
            for attr, value in faculty_data.items():
                setattr(profile, attr, value)
            profile.save()
        elif instance.role == User.Role.HOD and hod_data:
            profile, _ = HODProfile.objects.get_or_create(user=instance)
            for attr, value in hod_data.items():
                setattr(profile, attr, value)
            profile.save()
        elif instance.role == User.Role.IQAC and iqac_data:
            profile, _ = IQACProfile.objects.get_or_create(user=instance)
            for attr, value in iqac_data.items():
                setattr(profile, attr, value)
            profile.save()

        return instance
