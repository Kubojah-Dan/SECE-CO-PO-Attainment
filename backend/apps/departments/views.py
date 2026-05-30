from rest_framework import viewsets, permissions
from .models import (
    College, Department, Programme, ProgramOutcome,
    ProgramSpecificOutcome, Batch, Section, Regulation
)
from .serializers import (
    CollegeSerializer, DepartmentSerializer, ProgrammeSerializer,
    ProgramOutcomeSerializer, ProgramSpecificOutcomeSerializer,
    BatchSerializer, SectionSerializer, RegulationSerializer
)


class CollegeViewSet(viewsets.ModelViewSet):
    queryset = College.objects.all()
    serializer_class = CollegeSerializer
    permission_classes = [permissions.IsAuthenticated]


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Department.objects.all().distinct().order_by('name')


class ProgrammeViewSet(viewsets.ModelViewSet):
    queryset = Programme.objects.all()
    serializer_class = ProgrammeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['department', 'degree_type', 'is_active']


class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcome.objects.all()
    serializer_class = ProgramOutcomeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['programme', 'category']


class ProgramSpecificOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramSpecificOutcome.objects.all()
    serializer_class = ProgramSpecificOutcomeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['programme']


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.all()
    serializer_class = BatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['programme', 'is_active']


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['batch', 'batch__programme__department']


class RegulationViewSet(viewsets.ModelViewSet):
    queryset = Regulation.objects.all()
    serializer_class = RegulationSerializer
    permission_classes = [permissions.IsAuthenticated]
