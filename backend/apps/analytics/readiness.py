from django.db.models import Count, Q
from apps.departments.models import Department, Programme
from apps.subjects.models import Subject, CourseOutcome, COPOMapping
from apps.allocations.models import SubjectAllocation
from apps.attainment.models import COAttainment, ActionTakenReport, POAttainment

class AccreditationReadinessService:
    """
    Calculates NBA/NAAC readiness scores based on data completeness, 
    attainment progress, and quality loop (ATR) status.
    """

    @classmethod
    def get_department_readiness(cls, department_id, academic_year_id):
        subjects = Subject.objects.filter(department_id=department_id)
        allocations = SubjectAllocation.objects.filter(
            subject__in=subjects, 
            academic_year_id=academic_year_id
        )
        
        if not allocations.exists():
            return {"score": 0, "status": "No allocations found"}

        total_allocations = allocations.count()
        
        # 1. Mapping Completeness (30%)
        # Check if all subjects have COs and CO-PO mappings
        subjects_with_cos = CourseOutcome.objects.filter(subject__in=subjects).values('subject').distinct().count()
        mapping_score = (subjects_with_cos / subjects.count()) * 30 if subjects.count() > 0 else 0
        
        # 2. Mark Entry & Attainment Progress (40%)
        # Check how many allocations have final attainment calculated
        attained_count = COAttainment.objects.filter(
            subject_allocation__in=allocations
        ).values('subject_allocation').distinct().count()
        execution_score = (attained_count / total_allocations) * 40 if total_allocations > 0 else 0
        
        # 3. Action Taken Report (ATR) Status (30%)
        # Check if low attainment subjects have ATRs
        low_attainment_allocs = COAttainment.objects.filter(
            subject_allocation__in=allocations,
            target_achieved=False
        ).values_list('subject_allocation', flat=True).distinct()
        
        if low_attainment_allocs.exists():
            atr_count = ActionTakenReport.objects.filter(
                subject_allocation_id__in=low_attainment_allocs,
                implementation_status__in=['SUBMITTED', 'REVIEWED', 'IMPLEMENTED', 'EFFECTIVE']
            ).count()
            atr_score = (atr_count / low_attainment_allocs.count()) * 30
        else:
            atr_score = 30 # No low attainment means perfect score for ATR module

        total_score = round(mapping_score + execution_score + atr_score, 1)
        
        return {
            "nba_readiness_score": total_score,
            "naac_readiness_score": round(total_score * 0.95, 1), # Simplified projection
            "metrics": {
                "mapping_completeness": f"{round((mapping_score/30)*100)}%",
                "attainment_progress": f"{round((execution_score/40)*100)}%",
                "atr_compliance": f"{round((atr_score/30)*100)}%"
            },
            "gaps": cls._identify_gaps(department_id, allocations, low_attainment_allocs)
        }

    @classmethod
    def _identify_gaps(cls, department_id, allocations, low_attainment_allocs):
        gaps = []
        
        # Missing ATRs
        missing_atr_count = low_attainment_allocs.count() - ActionTakenReport.objects.filter(
            subject_allocation_id__in=low_attainment_allocs
        ).count()
        if missing_atr_count > 0:
            gaps.append(f"{missing_atr_count} subjects pending Action Taken Reports (ATR)")

        # Pending Attainments
        total_allocations = allocations.count()
        attained_count = COAttainment.objects.filter(
            subject_allocation__in=allocations
        ).values('subject_allocation').distinct().count()
        if attained_count < total_allocations:
            gaps.append(f"{total_allocations - attained_count} subjects pending final attainment calculation")

        return gaps
