from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    AssessmentType, SubjectAllocation, SubjectAssessmentConfig, COAssessmentMapping
)
from .serializers import (
    AssessmentTypeSerializer, SubjectAllocationSerializer,
    SubjectAssessmentConfigSerializer, COAssessmentMappingSerializer
)


class AssessmentTypeViewSet(viewsets.ModelViewSet):
    queryset = AssessmentType.objects.all().order_by('display_order', 'id')
    serializer_class = AssessmentTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'is_system']

    def perform_create(self, serializer):
        """When a new AssessmentType is created, auto-create SubjectAssessmentConfig
        entries for ALL existing SubjectAllocations so calculations pick it up."""
        from decimal import Decimal
        instance = serializer.save()
        max_val = instance.default_max_marks or Decimal('100.00')
        allocations = SubjectAllocation.objects.all()
        configs = [
            SubjectAssessmentConfig(
                subject_allocation=alloc,
                assessment_type=instance,
                is_enabled=True,
                max_marks=max_val,
                passing_marks=max_val * Decimal('0.5')
            )
            for alloc in allocations
        ]
        SubjectAssessmentConfig.objects.bulk_create(configs, ignore_conflicts=True)


class SubjectAllocationViewSet(viewsets.ModelViewSet):
    queryset = SubjectAllocation.objects.all().order_by('id')
    serializer_class = SubjectAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['faculty', 'subject', 'section', 'academic_year', 'subject__department']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """HOD action to approve/reject attainment data."""
        allocation = self.get_object()
        status_val = request.data.get('status')
        remarks = request.data.get('remarks', '')

        if status_val not in [SubjectAllocation.ApprovalStatus.APPROVED, SubjectAllocation.ApprovalStatus.REJECTED]:
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        allocation.approval_status = status_val
        allocation.hod_remarks = remarks
        allocation.save()

        # Trigger live push notification to the faculty member
        try:
            from apps.audit.models import create_notification
            create_notification(
                user=allocation.faculty.user,
                title=f"Attainment {status_val.capitalize()}",
                message=f"HOD has {status_val.lower()} your attainment data for {allocation.subject.subject_code}. Remarks: {remarks}",
                level="success" if status_val == SubjectAllocation.ApprovalStatus.APPROVED else "warning"
            )
        except Exception as e:
            pass

        return Response({
            'message': f'Allocation {status_val.lower()} successfully.',
            'status': status_val
        })

    @action(detail=True, methods=['patch'], url_path='toggle-staff-entry')
    def toggle_staff_entry(self, request, pk=None):
        """
        PATCH /allocations/allocations/{id}/toggle-staff-entry/
        Body: { "enabled": true }
        Faculty (owner) or HOD (of the allocation's department) can toggle
        whether HR Staff may upload marks for this subject.
        """
        allocation = self.get_object()
        user = request.user

        is_owner = (
            user.role == 'faculty'
            and hasattr(user, 'faculty_profile')
            and allocation.faculty == user.faculty_profile
        )
        is_hod = (
            user.role == 'hod'
            and hasattr(user, 'hod_profile')
            and allocation.subject.department == user.hod_profile.department
        )
        if not (is_owner or is_hod):
            return Response(
                {'detail': 'Not authorized to toggle staff mark entry for this subject.'},
                status=status.HTTP_403_FORBIDDEN
            )

        enabled = bool(request.data.get('enabled', False))
        allocation.staff_mark_entry_enabled = enabled
        allocation.save(update_fields=['staff_mark_entry_enabled'])
        return Response({'staff_mark_entry_enabled': enabled})


class SubjectAssessmentConfigViewSet(viewsets.ModelViewSet):
    queryset = SubjectAssessmentConfig.objects.all().order_by('id')
    serializer_class = SubjectAssessmentConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['subject_allocation', 'assessment_type', 'is_enabled']


class COAssessmentMappingViewSet(viewsets.ModelViewSet):
    queryset = COAssessmentMapping.objects.all().order_by('id')
    serializer_class = COAssessmentMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['assessment_config', 'co']
