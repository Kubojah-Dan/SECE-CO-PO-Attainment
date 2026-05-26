from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import StudentMark, ExcelUploadLog, QuestionCOMapping, StudentQuestionMark
from .serializers import (
    StudentMarkSerializer, ExcelUploadLogSerializer,
    QuestionCOMappingSerializer, StudentQuestionMarkSerializer
)
from .tasks import process_marks_excel
from apps.reports.excel_generators import generate_marks_template
from django.http import HttpResponse
from apps.allocations.models import SubjectAllocation, SubjectAssessmentConfig, AssessmentType
from apps.students.models import Student
from apps.students.serializers import StudentSerializer
from apps.allocations.serializers import SubjectAllocationSerializer, SubjectAssessmentConfigSerializer

class StudentMarkViewSet(viewsets.ModelViewSet):
    queryset = StudentMark.objects.all()
    serializer_class = StudentMarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = StudentMark.objects.all().select_related('student', 'subject_allocation', 'assessment_type', 'entered_by')
        
        subject_allocation = self.request.query_params.get('subject_allocation')
        assessment_type = self.request.query_params.get('assessment_type')
        student = self.request.query_params.get('student')

        if subject_allocation:
            queryset = queryset.filter(subject_allocation_id=subject_allocation)
        
        if assessment_type:
            if assessment_type.isdigit():
                queryset = queryset.filter(assessment_type_id=assessment_type)
            else:
                queryset = queryset.filter(assessment_type__code__iexact=assessment_type)
                
        if student:
            queryset = queryset.filter(student_id=student)

        return queryset.order_by('student__roll_number')

    @action(detail=False, methods=['post', 'put'])
    def bulk_update(self, request, alloc_id=None):
        """Bulk update marks from the frontend grid."""
        marks_data = request.data.get('marks', [])
        allocation_id = alloc_id or request.data.get('subject_allocation')
        assessment_code = request.data.get('assessment_type')
        
        if not allocation_id or not assessment_code:
            return Response({'error': 'subject_allocation and assessment_type are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.allocations.models import AssessmentType, SubjectAssessmentConfig
        try:
            assessment_type = AssessmentType.objects.get(code=assessment_code)
            cfg = SubjectAssessmentConfig.objects.filter(
                subject_allocation_id=allocation_id,
                assessment_type=assessment_type
            ).first()
            if cfg and not cfg.is_enabled:
                return Response({'error': f'Assessment type {assessment_code} is disabled/excluded for this subject.'}, status=status.HTTP_400_BAD_REQUEST)
        except AssessmentType.DoesNotExist:
            return Response({'error': f'Invalid assessment type: {assessment_code}'}, status=status.HTTP_400_BAD_REQUEST)

        # Persist max_marks to SubjectAssessmentConfig
        max_marks_val = request.data.get('max_marks', 100)
        SubjectAssessmentConfig.objects.update_or_create(
            subject_allocation_id=allocation_id,
            assessment_type=assessment_type,
            defaults={'max_marks': max_marks_val}
        )

        updated = 0
        for item in marks_data:
            StudentMark.objects.update_or_create(
                student_id=item['student_id'],
                subject_allocation_id=allocation_id,
                assessment_type=assessment_type,
                defaults={
                    'marks_obtained': item.get('marks_obtained', 0),
                    'max_marks': max_marks_val,
                    'is_absent': item.get('is_absent', False),
                    'entered_by': request.user
                }
            )
            updated += 1
        
        # Trigger attainment recalculation
        from .tasks import calculate_attainment
        calculate_attainment.delay(allocation_id)
            
        return Response({'message': f'{updated} marks updated successfully.'})


class ExcelUploadLogViewSet(viewsets.ModelViewSet):
    queryset = ExcelUploadLog.objects.all()
    serializer_class = ExcelUploadLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['subject_allocation', 'assessment_type']

    def create(self, request, *args, **kwargs):
        """Upload Excel file and queue Celery task."""
        file = request.FILES.get('file')
        allocation_id = request.data.get('subject_allocation')
        assessment_code = request.data.get('assessment_type')

        if not file or not allocation_id or not assessment_code:
            return Response({'error': 'File, subject_allocation, and assessment_type are required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.allocations.models import AssessmentType, SubjectAssessmentConfig
        try:
            assessment_type = AssessmentType.objects.get(code=assessment_code)
            cfg = SubjectAssessmentConfig.objects.filter(
                subject_allocation_id=allocation_id,
                assessment_type=assessment_type
            ).first()
            if cfg and not cfg.is_enabled:
                return Response({'error': f'Assessment type {assessment_code} is disabled/excluded for this subject.'}, status=status.HTTP_400_BAD_REQUEST)
        except AssessmentType.DoesNotExist:
            return Response({'error': f'Invalid assessment type: {assessment_code}'}, status=status.HTTP_400_BAD_REQUEST)

        log = ExcelUploadLog.objects.create(
            uploaded_by=request.user,
            subject_allocation_id=allocation_id,
            assessment_type=assessment_type,
            filename=file.name,
            file=file
        )

        # Queue the background task
        process_marks_excel.delay(log.id)

        return Response(ExcelUploadLogSerializer(log).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='download-template')
    def download_template(self, request):
        """GET /api/marks/excel-uploads/download-template/?allocation=ID&assessment=CODE"""
        allocation_id = request.query_params.get('allocation')
        assessment_code = request.query_params.get('assessment')

        if not allocation_id or not assessment_code:
            return Response({'error': 'allocation and assessment parameters are required.'}, status=400)

        try:
            excel_data = generate_marks_template(allocation_id, assessment_code)
            filename = f"Marks_Template_{assessment_code}.xlsx"
            
            response = HttpResponse(
                excel_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=500)



class QuestionCOMappingViewSet(viewsets.ModelViewSet):
    queryset = QuestionCOMapping.objects.all()
    serializer_class = QuestionCOMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = QuestionCOMapping.objects.all().select_related('subject_allocation', 'assessment_type', 'co')
        
        alloc_id = self.request.query_params.get('subject_allocation')
        assessment_type = self.request.query_params.get('assessment_type')
        assessment_type_code = self.request.query_params.get('assessment_type__code')
        question_number = self.request.query_params.get('question_number')

        if alloc_id:
            queryset = queryset.filter(subject_allocation_id=alloc_id)
        if assessment_type:
            if assessment_type.isdigit():
                queryset = queryset.filter(assessment_type_id=assessment_type)
            else:
                queryset = queryset.filter(assessment_type__code__iexact=assessment_type)
        if assessment_type_code:
            queryset = queryset.filter(assessment_type__code__iexact=assessment_type_code)
        if question_number:
            queryset = queryset.filter(question_number=question_number)

        return queryset.order_by('question_number')

    def perform_create(self, serializer):
        # Resolve assessment_type if code is provided instead of ID
        data = self.request.data
        if isinstance(data.get('assessment_type'), str) and not data.get('assessment_type').isdigit():
            from apps.allocations.models import AssessmentType
            atype = AssessmentType.objects.get(code=data.get('assessment_type'))
            serializer.save(assessment_type=atype)
        else:
            serializer.save()


class StudentQuestionMarkViewSet(viewsets.ModelViewSet):
    queryset = StudentQuestionMark.objects.all()
    serializer_class = StudentQuestionMarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = StudentQuestionMark.objects.all().select_related('student', 'question_mapping')
        
        student = self.request.query_params.get('student')
        question_mapping = self.request.query_params.get('question_mapping')
        alloc_id = self.request.query_params.get('question_mapping__subject_allocation')
        assessment_code = self.request.query_params.get('question_mapping__assessment_type__code')

        if student:
            queryset = queryset.filter(student_id=student)
        if question_mapping:
            queryset = queryset.filter(question_mapping_id=question_mapping)
        if alloc_id:
            queryset = queryset.filter(question_mapping__subject_allocation_id=alloc_id)
        if assessment_code:
            queryset = queryset.filter(question_mapping__assessment_type__code__iexact=assessment_code)

        return queryset.order_by('student__roll_number', 'question_mapping__question_number')

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update marks per question."""
        marks_data = request.data.get('marks', [])
        updated = 0
        allocation_id = None
        
        for item in marks_data:
            qm, created = StudentQuestionMark.objects.update_or_create(
                student_id=item['student'],
                question_mapping_id=item['question_mapping'],
                defaults={'marks_obtained': item['marks_obtained']}
            )
            if not allocation_id:
                allocation_id = qm.question_mapping.subject_allocation_id
            updated += 1

        # Trigger attainment recalculation if we have an allocation ID
        if allocation_id:
            from .tasks import calculate_attainment
            calculate_attainment.delay(allocation_id)

        return Response({'message': f'{updated} question marks updated.'})


class FacultySubjectViewSet(viewsets.ReadOnlyModelViewSet):
    """Viewset for faculty to view their assigned subjects and related data."""
    queryset = SubjectAllocation.objects.all().order_by('id')
    serializer_class = SubjectAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SubjectAllocation.objects.filter(faculty__user=self.request.user)
        ay = self.request.query_params.get('academic_year')
        if ay:
            qs = qs.filter(academic_year_id=ay)
        return qs.order_by('id')

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        """Get students for this allocation's section."""
        allocation = self.get_object()
        students = Student.objects.filter(section=allocation.section, is_active=True)
        return Response(StudentSerializer(students, many=True).data)

    @action(detail=True, methods=['get'])
    def assessments(self, request, pk=None):
        """Get assessment configurations for this allocation."""
        allocation = self.get_object()
        configs = SubjectAssessmentConfig.objects.filter(subject_allocation=allocation)
        return Response(SubjectAssessmentConfigSerializer(configs, many=True).data)

    @action(detail=True, methods=['post'], url_path='save-cos')
    def save_cos(self, request, pk=None):
        """Save/Update Course Outcomes for the subject."""
        allocation = self.get_object()
        cos_data = request.data.get('cos', [])
        
        from apps.subjects.models import CourseOutcome
        from django.db import transaction

        with transaction.atomic():
            # Keep track of updated CO IDs to delete any removed ones
            updated_ids = []
            for item in cos_data:
                co, _ = CourseOutcome.objects.update_or_create(
                    subject=allocation.subject,
                    co_number=item['co_number'],
                    defaults={
                        'co_code': item.get('co_code', f"CO{item['co_number']}"),
                        'description': item['description'],
                        'bloom_level': item.get('bloom_level', 'Apply')
                    }
                )
                updated_ids.append(co.id)
            
            # Optionally delete COs not in the list (Institutional rule: don't delete if attainment exists)
            # CourseOutcome.objects.filter(subject=allocation.subject).exclude(id__in=updated_ids).delete()

        return Response({'message': f'{len(updated_ids)} COs saved successfully.'})

    @action(detail=True, methods=['post'], url_path='save-mappings')
    def save_mappings(self, request, pk=None):
        """Save CO-PO and CO-PSO mappings."""
        allocation = self.get_object()
        mapping_data = request.data.get('mappings', {})
        
        from apps.subjects.models import CourseOutcome, COPOMapping, COPSOMapping
        from django.db import transaction

        with transaction.atomic():
            for key, level in mapping_data.items():
                try:
                    parts = key.split('-')
                    if len(parts) == 3:
                        co_id, target_type, target_id = parts
                        if target_type == 'po':
                            if level > 0:
                                COPOMapping.objects.update_or_create(
                                    co_id=co_id, po_id=target_id,
                                    defaults={'correlation_level': level}
                                )
                            else:
                                COPOMapping.objects.filter(co_id=co_id, po_id=target_id).delete()
                        elif target_type == 'pso':
                            if level > 0:
                                COPSOMapping.objects.update_or_create(
                                    co_id=co_id, pso_id=target_id,
                                    defaults={'correlation_level': level}
                                )
                            else:
                                COPSOMapping.objects.filter(co_id=co_id, pso_id=target_id).delete()
                    elif len(parts) == 2:
                        co_id, target_id = parts
                        
                        # Attempt PO mapping
                        if level > 0:
                            # Check if target_id is a PO
                            from apps.departments.models import ProgramOutcome, ProgramSpecificOutcome
                            if ProgramOutcome.objects.filter(id=target_id).exists():
                                COPOMapping.objects.update_or_create(
                                    co_id=co_id, po_id=target_id,
                                    defaults={'correlation_level': level}
                                )
                            elif ProgramSpecificOutcome.objects.filter(id=target_id).exists():
                                COPSOMapping.objects.update_or_create(
                                    co_id=co_id, pso_id=target_id,
                                    defaults={'correlation_level': level}
                                )
                        else:
                            # If level is 0, delete mapping
                            COPOMapping.objects.filter(co_id=co_id, po_id=target_id).delete()
                            COPSOMapping.objects.filter(co_id=co_id, pso_id=target_id).delete()
                except Exception:
                    continue

        return Response({'message': 'Mappings saved successfully.'})
