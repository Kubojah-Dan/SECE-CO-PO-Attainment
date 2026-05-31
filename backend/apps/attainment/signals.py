"""
SECE CO-PO Platform — Attainment App Signals
FIX 8c: Invalidate stale attainment records when AttainmentConfig thresholds change.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


@receiver(post_save, sender='attainment.AttainmentConfig')
def on_attainment_config_change(sender, instance, created, **kwargs):
    """
    When AttainmentConfig is saved (thresholds, weightages, etc. change),
    all previously computed attainment records become stale.

    Strategy: Delete the stale records so the UI shows 'not calculated'
    rather than silently presenting numbers computed with old thresholds.
    Faculty/HOD must re-trigger calculation after a config change.

    Scope:
      - If config.department is set → delete attainment for that department's subjects only.
      - If config.department is None (global default) → delete ALL attainment records.

    We do NOT auto-trigger recalculation here to avoid cascading Celery tasks.
    """
    if created:
        # A brand-new config has no stale records to clear.
        return

    from apps.attainment.models import COAttainment, POAttainment, PSOAttainment
    from apps.allocations.models import SubjectAllocation

    if instance.department_id:
        # Department-scoped config: clear only that department's attainment.
        allocations = SubjectAllocation.objects.filter(
            subject__department_id=instance.department_id
        )
        allocation_ids = list(allocations.values_list('id', flat=True))

        section_ay_pairs = list(
            allocations.values_list('section_id', 'academic_year_id').distinct()
        )

        deleted_co, _ = COAttainment.objects.filter(
            subject_allocation_id__in=allocation_ids
        ).delete()

        deleted_po = 0
        deleted_pso = 0
        for section_id, ay_id in section_ay_pairs:
            d, _ = POAttainment.objects.filter(
                section_id=section_id, academic_year_id=ay_id
            ).delete()
            deleted_po += d
            d, _ = PSOAttainment.objects.filter(
                section_id=section_id, academic_year_id=ay_id
            ).delete()
            deleted_pso += d

        logger.warning(
            f"[FIX 8] AttainmentConfig updated for department "
            f"'{instance.department.short_name}'. "
            f"Cleared {deleted_co} COAttainment, {deleted_po} POAttainment, "
            f"{deleted_pso} PSOAttainment records. "
            f"Recalculation required for all allocations in this department."
        )
    else:
        # Global config: ALL attainment records are now stale.
        deleted_co, _ = COAttainment.objects.all().delete()
        deleted_po, _ = POAttainment.objects.all().delete()
        deleted_pso, _ = PSOAttainment.objects.all().delete()

        logger.warning(
            f"[FIX 8] Global AttainmentConfig updated. "
            f"Cleared ALL attainment records: "
            f"{deleted_co} COAttainment, {deleted_po} POAttainment, "
            f"{deleted_pso} PSOAttainment. "
            f"All allocations require recalculation."
        )
