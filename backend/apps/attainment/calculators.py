"""
SECE CO-PO Platform — CO-PO Attainment Calculation Engine
Implements the exact NBA-prescribed methodology from Research1.md Section 5.

Formula Overview:
-----------------
1. For each CO, collect all assessments that test it (from COAssessmentMapping)
2. Per student: calculate weighted score across assessments
3. Count students scoring >= threshold_marks_pct (e.g., 60%)
4. Express as % of total students → map to Level 0/1/2/3
5. For PO: Σ(CO_level × correlation_weight) / Σ(correlation_weights)
"""
import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db import transaction
from django.core.cache import cache

from apps.marks.models import StudentMark
from apps.subjects.models import CourseOutcome
from apps.departments.models import ProgramOutcome, ProgramSpecificOutcome
from apps.allocations.models import SubjectAllocation, COAssessmentMapping
from apps.subjects.models import COPOMapping, COPSOMapping
from .models import (
    COAttainment, POAttainment, PSOAttainment, AttainmentConfig,
    CourseExitSurvey, SurveyResponse
)

logger = logging.getLogger(__name__)


def _get_config(department_id: int) -> AttainmentConfig:
    """Get attainment config for department, falling back to global default."""
    # Try department-specific config first
    config = AttainmentConfig.objects.filter(department_id=department_id).first()
    if config:
        return config
    # Fall back to global config (department=None)
    config = AttainmentConfig.objects.filter(department__isnull=True).first()
    if config:
        return config
    # Return in-memory default if DB has nothing
    return AttainmentConfig()


def _determine_level(attainment_pct: Decimal, config: AttainmentConfig) -> int:
    """Map student pass percentage to attainment level (0, 1, 2, 3)."""
    if attainment_pct >= config.level3_student_pct:
        return 3
    elif attainment_pct >= config.level2_student_pct:
        return 2
    elif attainment_pct >= config.level1_student_pct:
        return 1
    else:
        return 0


class COAttainmentCalculator:
    """
    NBA Method 1: Marks-based CO Attainment Calculation.

    Algorithm:
    1. For each CO, get all assessments covering it (via COAssessmentMapping)
    2. For each student, compute weighted score across those assessments
    3. Count students scoring >= threshold (e.g., 60% of max marks)
    4. Percentage of such students = CO attainment %
    5. Map to Level 0/1/2/3 based on config thresholds
    """

    def __init__(self, subject_allocation_id: int, config: Optional[AttainmentConfig] = None):
        self.allocation_id = subject_allocation_id
        try:
            self.allocation = (
                SubjectAllocation.objects
                .select_related('subject__department', 'section', 'faculty__user')
                .get(id=subject_allocation_id)
            )
        except SubjectAllocation.DoesNotExist:
            raise ValueError(f"SubjectAllocation {subject_allocation_id} not found")

        self.config = config or _get_config(self.allocation.subject.department_id)

    def _get_students(self):
        """Get all active students in this allocation's section."""
        from apps.students.models import Student
        return list(
            Student.objects.filter(
                section=self.allocation.section,
                is_active=True
            ).values_list('id', flat=True)
        )

    def _get_student_marks_for_assessment(self, assessment_type_id: int) -> dict:
        """Fetch all student marks for a given assessment, keyed by student_id."""
        marks = StudentMark.objects.filter(
            subject_allocation_id=self.allocation_id,
            assessment_type_id=assessment_type_id,
            is_absent=False,
        ).values('student_id', 'marks_obtained', 'max_marks')
        return {m['student_id']: m for m in marks}

    def _normalize_cia_marks(self, co_assessments) -> dict:
        """
        For CIA1/CIA2/CIA3, apply best-of-N normalization.
        Returns adjusted per-student scores for CIA component.
        """
        cia_codes = ['CIA1', 'CIA2', 'CIA3']
        cia_assessments = [
            ca for ca in co_assessments
            if ca.assessment_type.code in cia_codes
        ]

        if not cia_assessments:
            return {}

        students = self._get_students()
        student_cia_scores = {}

        for student_id in students:
            cia_scores = []
            for cia in cia_assessments:
                mark_data = StudentMark.objects.filter(
                    student_id=student_id,
                    subject_allocation_id=self.allocation_id,
                    assessment_type_id=cia.assessment_type_id,
                    is_absent=False,
                ).values('marks_obtained', 'max_marks').first()

                if mark_data and mark_data['max_marks'] > 0:
                    pct = Decimal(str(mark_data['marks_obtained'])) / Decimal(str(mark_data['max_marks'])) * 100
                    cia_scores.append(pct)

            if cia_scores:
                cia_scores.sort(reverse=True)
                best_n = int(self.config.cia_best_of)
                student_cia_scores[student_id] = sum(cia_scores[:best_n]) / len(cia_scores[:best_n])

        return student_cia_scores

    def calculate_co_attainment(self, co_id: int) -> Optional[dict]:
        """
        Calculate attainment for a single CO.
        Returns dict with attainment_percentage, level, student breakdown.
        """
        # Get all assessments covering this CO
        co_assessments = list(
            COAssessmentMapping.objects.filter(
                co_id=co_id,
                subject_allocation_id=self.allocation_id
            ).select_related('assessment_type')
        )

        if not co_assessments:
            logger.debug(f"CO {co_id} has no assessment mappings for allocation {self.allocation_id}")
            return None

        # Get students
        student_ids = self._get_students()
        total_students = len(student_ids)

        if total_students == 0:
            logger.warning(f"No students found for allocation {self.allocation_id}")
            return None

        # Calculate per-student CO performance (weighted across assessments)
        student_co_scores = {}

        # Pre-fetch all marks for this allocation to avoid N+1
        all_marks = {}
        question_mappings = {}
        
        from apps.marks.models import QuestionCOMapping, StudentQuestionMark
        
        for ca in co_assessments:
            # Check if this assessment has question-level mapping for this allocation
            q_maps = list(QuestionCOMapping.objects.filter(
                subject_allocation_id=self.allocation_id,
                assessment_type_id=ca.assessment_type_id,
                co_id=co_id
            ))
            
            if q_maps:
                question_mappings[ca.assessment_type_id] = q_maps
                # Pre-fetch question-wise marks
                q_marks = StudentQuestionMark.objects.filter(
                    question_mapping__in=q_maps
                ).values('student_id', 'marks_obtained', 'question_mapping__max_marks')
                
                # Group by student
                grouped_q_marks = {}
                for qm in q_marks:
                    sid = qm['student_id']
                    if sid not in grouped_q_marks:
                        grouped_q_marks[sid] = {'marks': Decimal('0'), 'max': Decimal('0')}
                    grouped_q_marks[sid]['marks'] += Decimal(str(qm['marks_obtained']))
                    grouped_q_marks[sid]['max'] += Decimal(str(qm['question_mapping__max_marks']))
                all_marks[ca.assessment_type_id] = grouped_q_marks
            else:
                # Fallback to total marks for the assessment
                all_marks[ca.assessment_type_id] = self._get_student_marks_for_assessment(
                    ca.assessment_type_id
                )

        for student_id in student_ids:
            weighted_score = Decimal('0')
            weighted_max = Decimal('0')

            for ca in co_assessments:
                mark_data = all_marks[ca.assessment_type_id].get(student_id)
                if mark_data:
                    # If it's question-wise data, mark_data has 'marks' and 'max' keys
                    if 'marks' in mark_data:
                        weighted_score += mark_data['marks']
                        weighted_max += mark_data['max']
                    else:
                        # Standard fallback: apply CO weightage to the total assessment mark
                        co_weight = Decimal(str(ca.weightage)) / Decimal('100')
                        weighted_score += Decimal(str(mark_data['marks_obtained'])) * co_weight
                        weighted_max += Decimal(str(mark_data['max_marks'])) * co_weight

            if weighted_max > 0:
                student_co_scores[student_id] = (weighted_score / weighted_max) * Decimal('100')

        # Count students who attained the threshold
        threshold = Decimal(str(self.config.threshold_marks_pct))
        attained_count = sum(
            1 for score in student_co_scores.values()
            if score >= threshold
        )

        attainment_pct = Decimal(str(attained_count)) / Decimal(str(total_students)) * Decimal('100')
        attainment_pct = attainment_pct.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        level = _determine_level(attainment_pct, self.config)

        return {
            'co_id': co_id,
            'attainment_percentage': float(attainment_pct),
            'attainment_level': level,
            'students_attained': attained_count,
            'total_students': total_students,
            'student_scores': {k: float(v) for k, v in student_co_scores.items()},
            'threshold_used': float(threshold),
        }

    def _create_default_assessment_mappings(self):
        from apps.subjects.models import CourseOutcome
        from apps.allocations.models import AssessmentType, COAssessmentMapping
        
        cos = list(CourseOutcome.objects.filter(subject=self.allocation.subject).order_by('co_number'))
        if not cos:
            for i in range(1, 6):
                co, _ = CourseOutcome.objects.get_or_create(
                    subject=self.allocation.subject,
                    co_number=i,
                    defaults={
                        'co_code': f'CO{i}',
                        'description': f'Understand and apply concepts of Course Outcome {i}',
                        'bloom_level': 'Apply'
                    }
                )
                cos.append(co)

        assessments = AssessmentType.objects.all()
        
        mappings_to_create = []
        for at in assessments:
            code = at.code.upper()
            if len(cos) >= 5:
                if code == 'CIA1':
                    mappings_to_create.append(COAssessmentMapping(co=cos[0], assessment_type=at, subject_allocation=self.allocation, weightage=Decimal('50.00')))
                    mappings_to_create.append(COAssessmentMapping(co=cos[1], assessment_type=at, subject_allocation=self.allocation, weightage=Decimal('50.00')))
                elif code == 'CIA2':
                    mappings_to_create.append(COAssessmentMapping(co=cos[2], assessment_type=at, subject_allocation=self.allocation, weightage=Decimal('50.00')))
                    mappings_to_create.append(COAssessmentMapping(co=cos[3], assessment_type=at, subject_allocation=self.allocation, weightage=Decimal('50.00')))
                elif code == 'CIA3':
                    mappings_to_create.append(COAssessmentMapping(co=cos[4], assessment_type=at, subject_allocation=self.allocation, weightage=Decimal('100.00')))
                else:
                    eq_weight = Decimal('100.00') / Decimal(str(len(cos)))
                    for co in cos:
                        mappings_to_create.append(COAssessmentMapping(co=co, assessment_type=at, subject_allocation=self.allocation, weightage=eq_weight))
            else:
                eq_weight = Decimal('100.00') / Decimal(str(len(cos)))
                for co in cos:
                    mappings_to_create.append(COAssessmentMapping(co=co, assessment_type=at, subject_allocation=self.allocation, weightage=eq_weight))
        
        if mappings_to_create:
            COAssessmentMapping.objects.bulk_create(mappings_to_create)

    def calculate_all_cos(self) -> list:
        """Calculate attainment for all COs of this subject allocation."""
        from apps.allocations.models import COAssessmentMapping
        if COAssessmentMapping.objects.filter(subject_allocation_id=self.allocation_id).count() == 0:
            logger.info(f"Auto-creating default COAssessmentMappings for allocation {self.allocation_id}")
            self._create_default_assessment_mappings()

        cos = CourseOutcome.objects.filter(
            subject=self.allocation.subject
        ).order_by('co_number')

        results = []
        for co in cos:
            result = self.calculate_co_attainment(co.id)
            if result:
                results.append(result)

        return results


class POAttainmentCalculator:
    """
    PO Attainment from CO Attainment via CO-PO mapping.

    Formula (from Research1.md Section 5.2):
    PO_attainment = Σ(CO_level × correlation_level) / Σ(correlation_level)

    Where correlation_level = 1 (Low), 2 (Medium), or 3 (High)
    """

    def calculate_po_attainment(self, po_id: int, co_attainments: list) -> Optional[dict]:
        """Calculate attainment for a single PO given CO attainment results."""
        mappings = list(
            COPOMapping.objects.filter(po_id=po_id)
            .select_related('co')
        )

        if not mappings:
            return None

        weighted_sum = Decimal('0')
        weight_total = Decimal('0')
        contributing_cos = []

        for mapping in mappings:
            # Find this CO's attainment from the pre-calculated results
            co_result = next(
                (r for r in co_attainments if r['co_id'] == mapping.co_id),
                None
            )
            if co_result:
                level = Decimal(str(co_result['attainment_level']))
                corr = Decimal(str(mapping.correlation_level))
                weighted_sum += level * corr
                weight_total += corr
                contributing_cos.append({
                    'co_id': mapping.co_id,
                    'co_level': co_result['attainment_level'],
                    'correlation': mapping.correlation_level,
                    'contribution': float(level * corr),
                })

        if weight_total == 0:
            return None

        po_attainment = weighted_sum / weight_total
        po_attainment = po_attainment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        return {
            'po_id': po_id,
            'attainment_value': float(po_attainment),
            'attainment_level': round(float(po_attainment)),
            'contributing_cos': contributing_cos,
        }

    def calculate_all_pos(self, programme_id: int, co_attainments: list) -> list:
        """Calculate attainment for all POs of a programme."""
        pos = ProgramOutcome.objects.filter(
            programme_id=programme_id,
            category='PO'
        ).order_by('po_number')

        results = []
        for po in pos:
            result = self.calculate_po_attainment(po.id, co_attainments)
            if result:
                results.append(result)

        return results


class PSOAttainmentCalculator:
    """PSO Attainment via CO-PSO mapping (same formula as PO)."""

    def calculate_pso_attainment(self, pso_id: int, co_attainments: list) -> Optional[dict]:
        mappings = list(COPSOMapping.objects.filter(pso_id=pso_id).select_related('co'))
        if not mappings:
            return None

        weighted_sum = Decimal('0')
        weight_total = Decimal('0')

        for mapping in mappings:
            co_result = next(
                (r for r in co_attainments if r['co_id'] == mapping.co_id),
                None
            )
            if co_result:
                level = Decimal(str(co_result['attainment_level']))
                corr = Decimal(str(mapping.correlation_level))
                weighted_sum += level * corr
                weight_total += corr

        if weight_total == 0:
            return None

        value = (weighted_sum / weight_total).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return {
            'pso_id': pso_id,
            'attainment_value': float(value),
            'attainment_level': round(float(value)),
        }

    def calculate_all_psos(self, programme_id: int, co_attainments: list) -> list:
        psos = ProgramSpecificOutcome.objects.filter(
            programme_id=programme_id
        ).order_by('pso_number')
        return [self.calculate_pso_attainment(pso.id, co_attainments) for pso in psos if
                self.calculate_pso_attainment(pso.id, co_attainments)]



class IndirectAttainmentCalculator:
    """
    Module 7: Indirect Attainment calculation based on Course Exit Surveys.
    
    Formula:
    Average student rating (1-3) for a CO, expressed as a percentage of max rating (3).
    Alternatively: % of students scoring >= threshold rating.
    """
    def __init__(self, subject_allocation_id: int):
        self.allocation_id = subject_allocation_id

    def calculate_indirect_attainment(self, co_id: int) -> Decimal:
        """Calculate indirect attainment percentage for a CO."""
        responses = SurveyResponse.objects.filter(
            survey__subject_allocation_id=self.allocation_id,
            co_id=co_id
        ).values_list('rating', flat=True)

        if not responses:
            return Decimal('0')

        # Calculate average rating
        avg_rating = sum(responses) / len(responses)
        # Convert 1-3 scale to percentage (e.g., 3/3 = 100%, 2/3 = 66.6%)
        attainment_pct = (Decimal(str(avg_rating)) / Decimal('3')) * Decimal('100')
        return attainment_pct.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class AttainmentOrchestrator:
    """
    Master orchestrator — calculates CO → PO → PSO attainment,
    persists results to DB, and invalidates Redis cache.

    Usage:
        orchestrator = AttainmentOrchestrator(subject_allocation_id=42)
        results = orchestrator.run()
    """

    def __init__(self, subject_allocation_id: int):
        self.allocation_id = subject_allocation_id
        try:
            self.allocation = (
                SubjectAllocation.objects
                .select_related(
                    'subject__department',
                    'section__batch__programme',
                    'academic_year',
                    'faculty__user',
                )
                .get(id=subject_allocation_id)
            )
        except SubjectAllocation.DoesNotExist:
            raise ValueError(f"SubjectAllocation {subject_allocation_id} not found")

        self.config = _get_config(self.allocation.subject.department_id)
        self.programme = self.allocation.section.batch.programme

    @transaction.atomic
    def run(self) -> dict:
        """Full attainment calculation pipeline. Wrapped in a transaction."""
        logger.info(
            f"[Attainment] Starting calculation for allocation {self.allocation_id}: "
            f"{self.allocation.subject.subject_code} / {self.allocation.section}"
        )

        # ── Step 1: CO Attainment ────────────────────────────────────
        co_calculator = COAttainmentCalculator(self.allocation_id, self.config)
        co_results = co_calculator.calculate_all_cos()

        # ── Step 2: Persist CO Results ───────────────────────────────
        indirect_calculator = IndirectAttainmentCalculator(self.allocation_id)
        
        for result in co_results:
            co_id = result['co_id']
            direct_attainment = Decimal(str(result['attainment_percentage']))
            indirect_attainment = indirect_calculator.calculate_indirect_attainment(co_id)
            
            # Combine Direct (80%) and Indirect (20%)
            d_weight = self.config.direct_weightage / Decimal('100')
            i_weight = self.config.indirect_weightage / Decimal('100')
            
            final_attainment = (direct_attainment * d_weight) + (indirect_attainment * i_weight)
            final_attainment = final_attainment.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Re-determine level based on final attainment if needed, or stick to marks-based level?
            # Standard NBA usually maps the Final Attainment % to a level.
            final_level = _determine_level(final_attainment, self.config)

            COAttainment.objects.update_or_create(
                co_id=co_id,
                subject_allocation_id=self.allocation_id,
                defaults={
                    'students_attained': result['students_attained'],
                    'total_students': result['total_students'],
                    'attainment_percentage': float(direct_attainment), # Keep direct pct for historical reasons
                    'direct_attainment': direct_attainment,
                    'indirect_attainment': indirect_attainment,
                    'final_attainment': final_attainment,
                    'attainment_level': final_level,
                    'target_achieved': final_level >= self.config.target_co_level,
                }
            )

        # ── Step 3: PO Attainment ────────────────────────────────────
        po_calculator = POAttainmentCalculator()
        po_results = po_calculator.calculate_all_pos(self.programme.id, co_results)

        # ── Step 4: Persist PO Results ───────────────────────────────
        for result in po_results:
            if result:
                POAttainment.objects.update_or_create(
                    po_id=result['po_id'],
                    section_id=self.allocation.section_id,
                    academic_year_id=self.allocation.academic_year_id,
                    defaults={
                        'semester': self.allocation.subject.semester,
                        'attainment_value': result['attainment_value'],
                        'attainment_level': result['attainment_level'],
                        'target_achieved': result['attainment_level'] >= self.config.target_co_level,
                    }
                )

        # ── Step 5: PSO Attainment ───────────────────────────────────
        pso_calculator = PSOAttainmentCalculator()
        pso_results = pso_calculator.calculate_all_psos(self.programme.id, co_results)

        for result in pso_results:
            if result:
                PSOAttainment.objects.update_or_create(
                    pso_id=result['pso_id'],
                    section_id=self.allocation.section_id,
                    academic_year_id=self.allocation.academic_year_id,
                    defaults={
                        'attainment_value': result['attainment_value'],
                        'attainment_level': result['attainment_level'],
                    }
                )

        # ── Step 6: Invalidate Cache ─────────────────────────────────
        self._invalidate_cache()

        logger.info(
            f"[Attainment] Completed for allocation {self.allocation_id}: "
            f"{len(co_results)} COs, {len(po_results)} POs, {len(pso_results)} PSOs"
        )

        return {
            'co_results': co_results,
            'po_results': po_results,
            'pso_results': pso_results,
            'allocation_id': self.allocation_id,
        }

    def _invalidate_cache(self):
        """Clear Redis cache keys related to this allocation's attainment."""
        dept_id = self.allocation.subject.department_id
        section_id = self.allocation.section_id
        ay_id = self.allocation.academic_year_id

        cache_keys = [
            f"sece_copo:attainment:allocation:{self.allocation_id}",
            f"sece_copo:attainment:dept:{dept_id}",
            f"sece_copo:po_attainment:section:{section_id}:ay:{ay_id}",
            f"sece_copo:hod:dashboard:{dept_id}",
            f"sece_copo:iqac:college_summary",
        ]
        for key in cache_keys:
            cache.delete(key)
