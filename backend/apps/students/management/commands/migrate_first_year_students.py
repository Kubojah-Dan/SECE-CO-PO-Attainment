"""
Management Command: migrate_first_year_students

Transfers a batch of S&H students into their target engineering department
at the start of Year 2. This is a one-time, per-cohort operation run by
the Admin or HOD.

Usage:
    python manage.py migrate_first_year_students \\
        --from-dept <s&h_dept_id> \\
        --to-dept   <target_dept_id> \\
        --batch     <batch_label_or_id> \\
        [--dry-run]

What it does:
  1. Finds all active students in the S&H department's batch/section.
  2. Updates Student.department -> target_department.
  3. Clears Student.target_department (migration is now complete).
  4. Prints a summary of how many students were moved.

The --dry-run flag lets admins preview the move without touching the DB.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


class Command(BaseCommand):
    help = 'Migrate S&H first-year students into their target engineering department.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--from-dept', type=int, required=True,
            help='ID of the S&H (source) department.'
        )
        parser.add_argument(
            '--to-dept', type=int, required=True,
            help='ID of the target engineering department.'
        )
        parser.add_argument(
            '--batch', type=str, default=None,
            help='Batch label (e.g. "2023-2027") or ID to restrict migration to a single cohort. '
                 'If omitted, ALL students in the S&H department with the matching target_department are migrated.'
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview the migration without making any database changes.'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.students.models import Student
        from apps.departments.models import Department, Batch

        from_dept_id = options['from_dept']
        to_dept_id   = options['to_dept']
        batch_filter = options.get('batch')
        dry_run      = options['dry_run']

        # Validate departments
        try:
            source_dept = Department.objects.get(pk=from_dept_id)
        except Department.DoesNotExist:
            raise CommandError(f'Source department ID {from_dept_id} does not exist.')
        if not source_dept.is_first_year:
            self.stdout.write(
                self.style.WARNING(
                    f'Warning: Department "{source_dept.name}" does not have is_first_year=True. '
                    'Proceeding anyway.'
                )
            )

        try:
            target_dept = Department.objects.get(pk=to_dept_id)
        except Department.DoesNotExist:
            raise CommandError(f'Target department ID {to_dept_id} does not exist.')

        # Build queryset
        qs = Student.objects.filter(
            department_id=from_dept_id,
            target_department_id=to_dept_id,
            is_active=True,
        )

        if batch_filter:
            # Try matching by label first, then by PK
            batch_qs = Batch.objects.filter(
                programme__department_id=from_dept_id
            )
            matched = batch_qs.filter(label=batch_filter)
            if not matched.exists():
                try:
                    matched = batch_qs.filter(pk=int(batch_filter))
                except ValueError:
                    raise CommandError(f'Batch "{batch_filter}" not found for source department.')
            if not matched.exists():
                raise CommandError(f'Batch "{batch_filter}" not found for source department.')
            batch_ids = list(matched.values_list('id', flat=True))
            qs = qs.filter(batch_id__in=batch_ids)

        count = qs.count()

        if count == 0:
            self.stdout.write(self.style.WARNING('No matching students found. Nothing to migrate.'))
            return

        self.stdout.write(
            f'\n{"[DRY RUN] " if dry_run else ""}Migrating {count} students:\n'
            f'  From: {source_dept.name} (ID {from_dept_id})\n'
            f'  To:   {target_dept.name} (ID {to_dept_id})\n'
        )

        if dry_run:
            # Show sample
            sample = qs.select_related('batch', 'section')[:10]
            for s in sample:
                self.stdout.write(f'  - [{s.roll_number}] {s.name} | Batch {s.batch.label} | Section {s.section.name}')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more.')
            self.stdout.write(self.style.SUCCESS('\n[DRY RUN] No changes made.'))
            transaction.set_rollback(True)
            return

        # Execute migration
        updated = qs.update(
            department_id=to_dept_id,
            target_department_id=None,  # clear migration target — migration is done
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully migrated {updated} students from '
                f'"{source_dept.name}" to "{target_dept.name}".'
            )
        )
