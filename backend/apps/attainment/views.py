from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    AttainmentConfig, COAttainment, POAttainment, PSOAttainment, ActionTakenReport
)
from .serializers import (
    AttainmentConfigSerializer, COAttainmentSerializer,
    POAttainmentSerializer, PSOAttainmentSerializer, ActionTakenReportSerializer
)
from apps.marks.tasks import calculate_attainment


class ActionTakenReportViewSet(viewsets.ModelViewSet):
    queryset = ActionTakenReport.objects.all()
    serializer_class = ActionTakenReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['subject_allocation', 'implementation_status']


class AttainmentConfigViewSet(viewsets.ModelViewSet):
    queryset = AttainmentConfig.objects.all()
    serializer_class = AttainmentConfigSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['department']


class COAttainmentViewSet(viewsets.ModelViewSet):
    queryset = COAttainment.objects.all()
    serializer_class = COAttainmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['subject_allocation', 'co']

    def get_queryset(self):
        qs = COAttainment.objects.all().select_related('co', 'subject_allocation__subject', 'subject_allocation__section')
        
        # HOD / Faculty/ IQAC filters
        dept_id = self.request.query_params.get('department')
        if not dept_id and hasattr(self.request.user, 'hod_profile'):
            dept_id = self.request.user.hod_profile.department_id
        if not dept_id and hasattr(self.request.user, 'faculty_profile'):
            dept_id = self.request.user.faculty_profile.department_id
            
        if dept_id:
            qs = qs.filter(subject_allocation__subject__department_id=dept_id)
            
        ay_id = self.request.query_params.get('academic_year')
        if ay_id:
            qs = qs.filter(subject_allocation__academic_year_id=ay_id)
            
        # Support single subject allocation
        subject_allocation_id = self.request.query_params.get('subject_allocation')
        if subject_allocation_id:
            qs = qs.filter(subject_allocation_id=subject_allocation_id)
            
        return qs

    @action(detail=False, methods=['post'])
    def calculate(self, request):
        """Trigger calculation of CO/PO/PSO attainment."""
        allocation_id = request.data.get('subject_allocation')
        if not allocation_id:
            return Response({'error': 'subject_allocation is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        calculate_attainment.delay(allocation_id)
        return Response({'message': 'Attainment calculation queued successfully.'})


class POAttainmentViewSet(viewsets.ModelViewSet):
    queryset = POAttainment.objects.all()
    serializer_class = POAttainmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['po']

    def get_queryset(self):
        qs = POAttainment.objects.all()
        allocation_id = self.request.query_params.get('subject_allocation')
        if allocation_id:
            try:
                from apps.allocations.models import SubjectAllocation
                allocation = SubjectAllocation.objects.get(id=allocation_id)
                qs = qs.filter(section=allocation.section, academic_year=allocation.academic_year)
            except SubjectAllocation.DoesNotExist:
                return POAttainment.objects.none()
        return qs


class PSOAttainmentViewSet(viewsets.ModelViewSet):
    queryset = PSOAttainment.objects.all()
    serializer_class = PSOAttainmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['pso']

    def get_queryset(self):
        qs = PSOAttainment.objects.all()
        allocation_id = self.request.query_params.get('subject_allocation')
        if allocation_id:
            try:
                from apps.allocations.models import SubjectAllocation
                allocation = SubjectAllocation.objects.get(id=allocation_id)
                qs = qs.filter(section=allocation.section, academic_year=allocation.academic_year)
            except SubjectAllocation.DoesNotExist:
                return PSOAttainment.objects.none()
        return qs
