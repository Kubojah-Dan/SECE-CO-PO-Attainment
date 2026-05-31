"""
SECE CO-PO Platform — Subjects App Signals
FIX 8: Invalidate stale attainment records when CO-PO or CO-PSO mappings change.
"""
import logging

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _invalidate_attainment_for_subject(subject):
    """
    Delete all COAttainment, POAttainment, and PSOAttainment records
    that are linked to any SubjectAllocation for the given subject.

    Called whenever CO-PO or CO-PSO mappings are created, updated, or deleted.
    Deleting stale records is safer than a 'stale' flag: the UI will show
    'not calculated' instead of silently presenting outdated numbers.
    Faculty must manually trigger recalculation after a mapping change.
    """
    from apps.attainment.models import COAttainment, POAttainment, PSOAttainment
    from apps.allocations.models import SubjectAllocation

    allocations = SubjectAllocation.objects.filter(subject=subject)
    if not allocations.exists():
        return

    allocation_ids = list(allocations.values_list('id', flat=True))

    # Collect the (section, academic_year) pairs so we can clear PO/PSO attainment
    section_ay_pairs = list(
        allocations.values_list('section_id', 'academic_year_id').distinct()
    )

    # Delete CO attainment for all affected allocations
    deleted_co, _ = COAttainment.objects.filter(
        subject_allocation_id__in=allocation_ids
    ).delete()

    # Delete PO/PSO attainment for the affected (section, academic_year) pairs
    deleted_po = 0
    deleted_pso = 0
    for section_id, ay_id in section_ay_pairs:
        d, _ = POAttainment.objects.filter(
            section_id=section_id,
            academic_year_id=ay_id,
        ).delete()
        deleted_po += d

        d, _ = PSOAttainment.objects.filter(
            section_id=section_id,
            academic_year_id=ay_id,
        ).delete()
        deleted_pso += d

    if deleted_co or deleted_po or deleted_pso:
        logger.warning(
            f"[FIX 8] CO-PO/PSO mapping changed for subject '{subject.subject_code}'. "
            f"Cleared {deleted_co} COAttainment, {deleted_po} POAttainment, "
            f"{deleted_pso} PSOAttainment records. "
            f"Faculty must recalculate attainment for affected allocations: "
            f"{allocation_ids}"
        )


# ── COPOMapping signals ────────────────────────────────────────────────────────

@receiver(post_save, sender='subjects.COPOMapping')
def on_copo_mapping_change(sender, instance, **kwargs):
    """Invalidate attainment when a CO-PO correlation is added or updated."""
    _invalidate_attainment_for_subject(instance.co.subject)


@receiver(post_delete, sender='subjects.COPOMapping')
def on_copo_mapping_delete(sender, instance, **kwargs):
    """Invalidate attainment when a CO-PO correlation is removed."""
    _invalidate_attainment_for_subject(instance.co.subject)


# ── COPSOMapping signals ───────────────────────────────────────────────────────

@receiver(post_save, sender='subjects.COPSOMapping')
def on_copso_mapping_change(sender, instance, **kwargs):
    """Invalidate attainment when a CO-PSO correlation is added or updated."""
    _invalidate_attainment_for_subject(instance.co.subject)


@receiver(post_delete, sender='subjects.COPSOMapping')
def on_copso_mapping_delete(sender, instance, **kwargs):
    """Invalidate attainment when a CO-PSO correlation is removed."""
    _invalidate_attainment_for_subject(instance.co.subject)
