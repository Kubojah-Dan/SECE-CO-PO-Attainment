from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .readiness import AccreditationReadinessService
from apps.attainment.models import POAttainment, COAttainment, ActionTakenReport
from apps.departments.models import Department, Batch, Regulation
from apps.subjects.models import Subject, AcademicYear, CourseOutcome
from apps.users.models import FacultyProfile
from apps.allocations.models import SubjectAllocation
from django.db.models import Avg, Count

class IQACDashboardView(APIView):
    """Institutional overview with readiness scores."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        dept_id = request.query_params.get('department')
        ay_id = request.query_params.get('academic_year')
        
        if not ay_id:
            return Response({"error": "academic_year parameter is required"}, status=400)
            
        data = {
            "college_name": "Sri Eshwar College of Engineering",
            "readiness": AccreditationReadinessService.get_department_readiness(dept_id, ay_id) if dept_id else None,
            "overall_attainment": POAttainment.objects.filter(academic_year_id=ay_id).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0
        }
        return Response(data)

class POBatchComparisonView(APIView):
    """Data for Radar charts comparing PO attainment across batches."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dept_id = request.query_params.get('department')
        if not dept_id:
            return Response({"error": "department_id is required"}, status=400)
            
        batches = Batch.objects.filter(programme__department_id=dept_id)[:3]
        radar_data = []
        
        for batch in batches:
            pos = POAttainment.objects.filter(section__batch=batch).values('po__po_code').annotate(val=Avg('attainment_value'))
            radar_data.append({
                "batch": batch.label,
                "values": {p['po__po_code']: float(p['val'] or 0) for p in pos}
            })
            
        return Response(radar_data)

class SubjectAttainmentHeatmapView(APIView):
    """Data for Heatmaps showing CO attainment across subjects."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dept_id = request.query_params.get('department')
        ay_id = request.query_params.get('academic_year')
        
        attainments = COAttainment.objects.filter(
            subject_allocation__subject__department_id=dept_id,
            subject_allocation__academic_year_id=ay_id
        ).select_related('co', 'subject_allocation__subject')
        
        heatmap = {}
        for att in attainments:
            sub_code = att.subject_allocation.subject.subject_code
            if sub_code not in heatmap:
                heatmap[sub_code] = {}
            heatmap[sub_code][att.co.co_code] = float(att.attainment_percentage or 0)
            
        return Response(heatmap)

class HODDashboardView(APIView):
    """Department-specific overview for HODs."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        dept_id = request.query_params.get('department')
        ay_id = request.query_params.get('academic_year')
        
        if not dept_id or not ay_id:
            return Response({"error": "department and academic_year parameters are required"}, status=400)
            
        from apps.allocations.models import SubjectAllocation
        from django.db.models import Count, Q
        
        allocations = SubjectAllocation.objects.filter(
            subject__department_id=dept_id,
            academic_year_id=ay_id
        ).select_related('faculty__user', 'subject', 'section')

        faculty_progress = []
        critical_subjects = []

        for alloc in allocations:
            # Calculate progress
            from apps.marks.models import StudentMark
            from apps.students.models import Student
            total_students = Student.objects.filter(section=alloc.section, is_active=True).count()
            entered_marks = StudentMark.objects.filter(subject_allocation=alloc, assessment_type__code='CIA1').count()
            progress = (entered_marks / total_students * 100) if total_students > 0 else 0
            
            faculty_name = "Not Assigned"
            if alloc.faculty and alloc.faculty.user:
                faculty_name = alloc.faculty.user.get_full_name()

            # Check attainment and identify critical subjects
            co_attainments = list(COAttainment.objects.filter(subject_allocation=alloc))
            has_attainment = len(co_attainments) > 0
            is_critical = any(att.final_attainment and att.final_attainment < 60 for att in co_attainments)

            progress_item = {
                "id": alloc.id,
                "faculty_name": faculty_name,
                "subject_name": alloc.subject.subject_name,
                "subject_code": alloc.subject.subject_code,
                "section_name": str(alloc.section),
                "progress": round(progress),
                "approval_status": alloc.approval_status,
                "attainment_status": "Calculated" if has_attainment else "Pending",
                "is_critical": is_critical
            }
            faculty_progress.append(progress_item)

            if is_critical:
                critical_subjects.append({
                    "id": alloc.id,
                    "subject": f"{alloc.subject.subject_code}: {alloc.subject.subject_name}",
                    "faculty": faculty_name,
                    "avg_attainment": float(COAttainment.objects.filter(subject_allocation=alloc).aggregate(Avg('final_attainment'))['final_attainment__avg'] or 0)
                })

        return Response({
            "readiness": AccreditationReadinessService.get_department_readiness(dept_id, ay_id),
            "faculty_progress": faculty_progress,
            "critical_subjects": critical_subjects,
            "department_id": dept_id,
            "academic_year_id": ay_id
        })

class HODAttainmentSummaryView(APIView):
    """Aggregated attainment statistics for a department."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dept_id = request.query_params.get('department')
        ay_id = request.query_params.get('academic_year')
        
        if not dept_id or not ay_id:
            return Response({"error": "department and academic_year parameters are required"}, status=400)

        # Aggregated PO attainment averages for the department
        po_averages = POAttainment.objects.filter(
            section__batch__programme__department_id=dept_id,
            academic_year_id=ay_id
        ).values('po__po_code').annotate(avg=Avg('attainment_value'))

        return Response({
            "po_averages": {item['po__po_code']: float(item['avg'] or 0) for item in po_averages},
            "status": "Calculated"
        })

class AdminCollegeOverviewView(APIView):
    """Institutional-level overview for Admin."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ay_id = request.query_params.get('academic_year')
        if not ay_id:
            # Fallback to current academic year if not provided
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if not current_ay:
                return Response({"error": "No academic year found"}, status=400)
            ay_id = current_ay.id

        # Summary statistics
        total_depts = Department.objects.count()
        total_faculty = FacultyProfile.objects.count()
        total_subjects = Subject.objects.filter(is_active=True).count()
        avg_attainment = POAttainment.objects.filter(academic_year_id=ay_id).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0

        # Calculate dynamic readiness metrics
        subjects = Subject.objects.filter(is_active=True)
        total_subjects_count = subjects.count()
        subjects_with_cos = CourseOutcome.objects.filter(subject__in=subjects).values('subject').distinct().count()
        doc_completeness = round((subjects_with_cos / total_subjects_count * 100) if total_subjects_count > 0 else 0, 1)

        allocations = SubjectAllocation.objects.filter(academic_year_id=ay_id)
        total_allocations = allocations.count()
        attained_count = COAttainment.objects.filter(
            subject_allocation__in=allocations
        ).values('subject_allocation').distinct().count()
        attainment_archiving = round((attained_count / total_allocations * 100) if total_allocations > 0 else 0, 1)

        # 3. ATR Status
        low_attainment_allocs = COAttainment.objects.filter(
            subject_allocation__in=allocations,
            target_achieved=False
        ).values_list('subject_allocation', flat=True).distinct()
        
        if low_attainment_allocs.exists():
            atr_count = ActionTakenReport.objects.filter(
                subject_allocation_id__in=low_attainment_allocs,
                implementation_status__in=['SUBMITTED', 'REVIEWED', 'IMPLEMENTED', 'EFFECTIVE']
            ).count()
            atr_compliance = round((atr_count / low_attainment_allocs.count() * 100) if low_attainment_allocs.count() > 0 else 0, 1)
        else:
            atr_compliance = 100

        # Calculate NBA Readiness = 30% mapping completeness + 40% attainment progress + 30% ATR compliance
        nba_readiness = round((doc_completeness * 0.3) + (attainment_archiving * 0.4) + (atr_compliance * 0.3), 1)
        naac_score = round(nba_readiness * 0.95, 1)

        # Department performance index with documentation readiness scores
        dept_performance = []
        for dept in Department.objects.all():
            attainment = POAttainment.objects.filter(
                section__batch__programme__department=dept,
                academic_year_id=ay_id
            ).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0
            
            # Fetch real department readiness
            readiness = AccreditationReadinessService.get_department_readiness(dept.id, ay_id)
            dept_performance.append({
                "name": dept.short_name,
                "attainment": float(attainment),
                "documentation": readiness.get('nba_readiness_score', 0) if isinstance(readiness, dict) else 0
            })

        # PO Radar Data (Global)
        po_radar = POAttainment.objects.filter(
            academic_year_id=ay_id
        ).values('po__po_code').annotate(val=Avg('attainment_value'))

        # Calculate dynamic growth trends
        trend_data = []
        for ay in AcademicYear.objects.all().order_by('label'):
            avg_att = POAttainment.objects.filter(academic_year=ay).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0
            trend_data.append({
                "year": ay.label,
                "avg": round(float(avg_att), 1)
            })
            
        # Fallback trend data if none exists
        if not trend_data:
            trend_data = [
                { "year": "2023-24", "avg": 0 },
                { "year": "2024-25", "avg": 0 }
            ]

        # Strategic insights
        top_dept = None
        top_doc_score = -1
        worst_dept = None
        worst_att_score = 999
        
        for dp in dept_performance:
            if dp['documentation'] > top_doc_score:
                top_doc_score = dp['documentation']
                top_dept = dp['name']
            if dp['attainment'] < worst_att_score:
                worst_att_score = dp['attainment']
                worst_dept = dp['name']
                
        # Handle empty departments/cases gracefully
        if not top_dept:
            top_dept = "Pending"
            top_doc_score = 0
        if worst_att_score == 999:
            worst_dept = "Pending"
            worst_att_score = 0

        insights = {
            "top_performer": {
                "dept": top_dept,
                "score": top_doc_score
            },
            "action_required": {
                "dept": worst_dept,
                "score": round(worst_att_score, 1)
            },
            "status": {
                "label": "NBA TIER-1 READY" if nba_readiness >= 80 else "AUDIT PENDING" if nba_readiness >= 50 else "PENDING DATA",
                "score": nba_readiness
            }
        }

        return Response({
            "stats": {
                "total_departments": total_depts,
                "total_faculty": total_faculty,
                "total_subjects": total_subjects,
                "avg_attainment": float(avg_attainment),
                "nba_readiness": nba_readiness,
                "naac_score": naac_score,
                "doc_completeness": doc_completeness,
                "attainment_archiving": attainment_archiving
            },
            "dept_performance": dept_performance,
            "po_radar": {p['po__po_code']: float(p['val'] or 0) for p in po_radar},
            "trend_data": trend_data,
            "insights": insights
        })
