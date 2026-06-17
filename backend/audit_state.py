import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sece_copo.settings')
django.setup()

from apps.authentication.models import User
from apps.users.models import FacultyProfile, HODProfile, IQACProfile
from apps.departments.models import Department, Programme, Regulation, Batch, Section
from apps.subjects.models import Subject, AcademicYear

print('=== CURRENT DB STATE ===')
print(f'Users: {User.objects.count()} total')
print(f'  Faculty profiles: {FacultyProfile.objects.count()}')
print(f'  HOD profiles: {HODProfile.objects.count()}')
print(f'  IQAC profiles: {IQACProfile.objects.count()}')
print(f'Departments: {Department.objects.count()}')
print(f'Programmes: {Programme.objects.count()}')
print(f'Regulations: {list(Regulation.objects.values_list("name", flat=True))}')
print(f'Batches: {Batch.objects.count()}')
print(f'Sections: {Section.objects.count()}')
print(f'AcademicYears: {list(AcademicYear.objects.values_list("label", flat=True))}')
print(f'Subjects: {Subject.objects.count()}')
print()
print('=== DEPTS ===')
for d in Department.objects.all().order_by('short_name'):
    hod = HODProfile.objects.filter(department=d).first()
    fac_count = FacultyProfile.objects.filter(department=d).count()
    hod_email = hod.user.email if hod else 'NONE'
    print(f'  {d.short_name:12} | HOD: {hod_email:35} | Faculty: {fac_count}')
