from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import (
    AcademicYear, Subject, CourseOutcome, COPOMapping, COPSOMapping
)
from .serializers import (
    AcademicYearSerializer, SubjectSerializer, CourseOutcomeSerializer,
    COPOMappingSerializer, COPSOMappingSerializer
)


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['patch'])
    def set_current(self, request, pk=None):
        """Set this academic year as current."""
        instance = self.get_object()
        instance.is_current = True
        instance.save()
        return Response({'message': f'{instance.label} set as current academic year.'})


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['department', 'semester', 'subject_type', 'is_active']


class CourseOutcomeViewSet(viewsets.ModelViewSet):
    queryset = CourseOutcome.objects.all()
    serializer_class = CourseOutcomeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['subject']


class COPOMappingViewSet(viewsets.ModelViewSet):
    queryset = COPOMapping.objects.all()
    serializer_class = COPOMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['co', 'po']


class COPSOMappingViewSet(viewsets.ModelViewSet):
    queryset = COPSOMapping.objects.all()
    serializer_class = COPSOMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['co', 'pso']
