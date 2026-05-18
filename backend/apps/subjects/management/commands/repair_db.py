from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Repairs database schema mismatches (missing columns from migrations)'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check for missing regulation_id in subject table
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='subject' AND column_name='regulation_id';
            """)
            if not cursor.fetchone():
                self.stdout.write(self.style.WARNING("Adding missing regulation_id to subject table..."))
                cursor.execute('ALTER TABLE subject ADD COLUMN regulation_id INTEGER REFERENCES regulation(id) ON DELETE SET NULL;')
                self.stdout.write(self.style.SUCCESS("Successfully added regulation_id."))
            else:
                self.stdout.write(self.style.SUCCESS("regulation_id already exists in subject table."))

            # Check for missing approval_status in subject_allocation
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='subject_allocation' AND column_name='approval_status';
            """)
            if not cursor.fetchone():
                self.stdout.write(self.style.WARNING("Adding missing approval_status to subject_allocation table..."))
                cursor.execute("ALTER TABLE subject_allocation ADD COLUMN approval_status VARCHAR(20) DEFAULT 'PENDING';")
                self.stdout.write(self.style.SUCCESS("Successfully added approval_status."))

            # Ensure experiment and lab_component tables exist (migration 0002)
            cursor.execute("SELECT to_regclass('experiment');")
            if not cursor.fetchone()[0]:
                self.stdout.write(self.style.WARNING("Experiment table missing. Please run migrations manually or check logs."))
            
            self.stdout.write(self.style.SUCCESS("Database repair check completed."))
