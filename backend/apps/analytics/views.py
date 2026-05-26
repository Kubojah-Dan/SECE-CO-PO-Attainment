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
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if not current_ay:
                return Response({"error": "No academic year found"}, status=400)
            ay_id = current_ay.id

        overall_attainment = POAttainment.objects.filter(academic_year_id=ay_id).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0
        department_count = Department.objects.count()
        faculty_count = FacultyProfile.objects.count()

        dept_metrics = []
        for dept in Department.objects.all():
            attainment = POAttainment.objects.filter(
                section__batch__programme__department=dept,
                academic_year_id=ay_id
            ).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0
            
            readiness = AccreditationReadinessService.get_department_readiness(dept.id, ay_id)
            readiness_score = readiness.get('nba_readiness_score', 0) if isinstance(readiness, dict) else 0

            dept_metrics.append({
                "dept": dept.short_name,
                "score": float(readiness_score),
                "attainment": float(attainment)
            })

        overall_readiness = sum([d['score'] for d in dept_metrics]) / max(len(dept_metrics), 1)

        from apps.attainment.models import ActionTakenReport
        recent_atrs_qs = ActionTakenReport.objects.filter(subject_allocation__academic_year_id=ay_id).select_related('subject_allocation__subject').order_by('-created_at')[:4]
        recent_atrs = []
        
        status_map = {
            'SUBMITTED': ('In Review', 'Activity', 'blue'),
            'REVIEWED': ('Delayed', 'AlertTriangle', 'amber'),
            'IMPLEMENTED': ('Open', 'Users', 'purple'),
            'EFFECTIVE': ('Ready', 'CheckCircle2', 'emerald')
        }

        for atr in recent_atrs_qs:
            status_info = status_map.get(atr.implementation_status, ('Pending', 'Activity', 'slate'))
            recent_atrs.append({
                "label": f"{atr.subject_allocation.subject.subject_code} ATR Review",
                "status": status_info[0],
                "icon": status_info[1],
                "color": status_info[2]
            })

        if not recent_atrs:
            recent_atrs = [
                { "label": "SAR Verification (Auto)", "status": "In Review", "icon": "Activity", "color": "blue" },
                { "label": "Attainment Analytics", "status": "Ready", "icon": "CheckCircle2", "color": "emerald" }
            ]

        data = {
            "college_name": "Sri Eshwar College of Engineering",
            "overall_attainment": float(overall_attainment),
            "overall_readiness": round(overall_readiness),
            "department_count": department_count,
            "faculty_count": faculty_count,
            "department_metrics": dept_metrics,
            "recent_atrs": recent_atrs
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
        
        if not dept_id:
            return Response({"error": "department parameter is required"}, status=400)
        if not ay_id:
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if not current_ay:
                return Response({"error": "No academic year found"}, status=400)
            ay_id = current_ay.id
            
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

        readiness_data = AccreditationReadinessService.get_department_readiness(dept_id, ay_id)
        if isinstance(readiness_data, dict):
            readiness_data['active_subjects'] = allocations.count()
            
            # Avg PO attainment across this dept
            dept_attainment = POAttainment.objects.filter(
                section__batch__programme__department_id=dept_id,
                academic_year_id=ay_id
            ).aggregate(Avg('attainment_value'))['attainment_value__avg'] or 0
            readiness_data['overall_attainment'] = float(dept_attainment)
            
            # Faculty participation (percent of allocated faculty who have entered marks)
            total_fac = allocations.values('faculty').distinct().count()
            participating_fac = allocations.filter(
                id__in=[f['id'] for f in faculty_progress if f['progress'] > 0]
            ).values('faculty').distinct().count()
            readiness_data['faculty_participation'] = int((participating_fac / total_fac * 100) if total_fac > 0 else 0)

        return Response({
            "readiness": readiness_data,
            "faculty_progress": faculty_progress,
            "critical_subjects": critical_subjects,
            "department_id": dept_id,
            "academic_year_id": ay_id
        })

class HODDepartmentReportsView(APIView):
    """Provides reporting table data for HOD Reports view."""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        dept_id = request.user.department_id
        ay_id = request.query_params.get('academic_year')
        
        if not dept_id or not ay_id:
            return Response({"error": "Missing dept or academic year"}, status=400)
            
        from apps.allocations.models import SubjectAllocation
        allocations = SubjectAllocation.objects.filter(
            subject__department_id=dept_id,
            academic_year_id=ay_id
        ).select_related('subject', 'faculty__user')
        
        reports = []
        for alloc in allocations:
            # overall attainment = avg of final_attainment of COs
            att = COAttainment.objects.filter(subject_allocation=alloc).aggregate(Avg('final_attainment'))['final_attainment__avg']
            
            reports.append({
                "id": alloc.id,
                "course_name": alloc.subject.subject_name,
                "course_code": alloc.subject.subject_code,
                "instructor_name": alloc.faculty.user.get_full_name() if alloc.faculty and alloc.faculty.user else "Not Assigned",
                "attainment_score": round(float(att or 0), 1),
                "updated_at": alloc.updated_at.strftime("%b %d, %Y") if alloc.updated_at else "Never"
            })
            
        return Response(reports)

class HODAttainmentSummaryView(APIView):
    """Aggregated attainment statistics for a department."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        dept_id = request.query_params.get('department')
        ay_id = request.query_params.get('academic_year')
        
        if not dept_id:
            return Response({"error": "department parameter is required"}, status=400)
        if not ay_id:
            current_ay = AcademicYear.objects.filter(is_current=True).first()
            if not current_ay:
                return Response({"error": "No academic year found"}, status=400)
            ay_id = current_ay.id

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
