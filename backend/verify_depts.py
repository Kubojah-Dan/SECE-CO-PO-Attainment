import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sece_copo.settings.development')
django.setup()

from apps.departments.models import Department

depts = Department.objects.all()
print(f"Total Departments: {depts.count()}")
for d in depts:
    print(f"- {d.short_name}: {d.name}")
