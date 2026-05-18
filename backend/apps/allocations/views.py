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
    queryset = AssessmentType.objects.all()
    serializer_class = AssessmentTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['category', 'is_active']


class SubjectAllocationViewSet(viewsets.ModelViewSet):
    queryset = SubjectAllocation.objects.all()
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


class SubjectAssessmentConfigViewSet(viewsets.ModelViewSet):
    queryset = SubjectAssessmentConfig.objects.all()
    serializer_class = SubjectAssessmentConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['allocation', 'assessment_type', 'is_enabled']


class COAssessmentMappingViewSet(viewsets.ModelViewSet):
    queryset = COAssessmentMapping.objects.all()
    serializer_class = COAssessmentMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['assessment_config', 'co']
