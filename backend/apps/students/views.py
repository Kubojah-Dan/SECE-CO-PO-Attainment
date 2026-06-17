"""
SECE CO-PO Platform — Students App Views
StudentViewSet and BatchMigrationView for S&H first-year student management.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction

from .models import Student
from .serializers import StudentSerializer
from apps.authentication.permissions import IsAdminUser, IsAdminOrHOD


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['department', 'batch', 'section', 'is_active', 'target_department']


class BatchMigrationView(APIView):
    """
    POST /students/batch-migrate/

    Migrates S&H first-year students to their target engineering department
    at the start of Year 2. Admin or HOD only.

    Request body:
        {
            "from_department": <int>,      -- S&H department ID
            "to_department":   <int>,      -- Target engineering dept ID
            "batch_ids":       [<int>, ...]  -- Optional: restrict to specific batch IDs
            "dry_run":         <bool>      -- Optional: preview only, no DB changes
        }

    Response:
        { "migrated": <int>, "dry_run": <bool>, "preview": [...] }
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOrHOD]

    @transaction.atomic
    def post(self, request):
        from_dept_id = request.data.get('from_department')
        to_dept_id   = request.data.get('to_department')
        batch_ids    = request.data.get('batch_ids', [])
        dry_run      = bool(request.data.get('dry_run', False))

        if not from_dept_id or not to_dept_id:
            return Response(
                {'error': 'from_department and to_department are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if from_dept_id == to_dept_id:
            return Response(
                {'error': 'from_department and to_department must be different.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.departments.models import Department
        try:
            source_dept = Department.objects.get(pk=from_dept_id)
            target_dept = Department.objects.get(pk=to_dept_id)
        except Department.DoesNotExist:
            return Response(
                {'error': 'One or both department IDs are invalid.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Build queryset
        qs = Student.objects.filter(
            department_id=from_dept_id,
            target_department_id=to_dept_id,
            is_active=True,
        )
        if batch_ids:
            qs = qs.filter(batch_id__in=batch_ids)

        count = qs.count()

        if dry_run:
            preview = list(
                qs.select_related('batch', 'section')
                .values('id', 'roll_number', 'name', 'batch__label', 'section__name')[:50]
            )
            transaction.set_rollback(True)
            return Response({
                'migrated': count,
                'dry_run': True,
                'from_department': source_dept.name,
                'to_department': target_dept.name,
                'preview': preview,
            })

        updated = qs.update(
            department_id=to_dept_id,
            target_department_id=None,  # migration done — clear the target pointer
        )

        return Response({
            'migrated': updated,
            'dry_run': False,
            'from_department': source_dept.name,
            'to_department': target_dept.name,
        }, status=status.HTTP_200_OK)
