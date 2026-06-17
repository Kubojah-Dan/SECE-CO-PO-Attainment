import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sece_copo.settings')
django.setup()

from django.test import Client
from django.urls import reverse
import json

def test_endpoints():
    c = Client()
    users_to_test = {
        'Admin': 'admin@sece.ac.in',
        'IQAC': 'iqac@sece.ac.in',
        'HOD': 'hod_cse@sece.ac.in',
        'Faculty': 'krishnaveni.s@sece.ac.in' # Or any populated faculty
    }
    
    # Check if krishnaveni exists, if not use the first available faculty
    from apps.authentication.models import User
    if not User.objects.filter(email='krishnaveni.s@sece.ac.in').exists():
        fac = User.objects.filter(role='FACULTY').first()
        if fac:
            users_to_test['Faculty'] = fac.email

    endpoints = [
        # Users
        '/api/users/',
        # Departments
        '/api/departments/',
        '/api/departments/batches/',
        '/api/departments/programmes/',
        '/api/departments/sections/',
        # Subjects
        '/api/subjects/',
        '/api/subjects/course-outcomes/',
        '/api/subjects/academic-years/',
        # Allocations
        '/api/allocations/',
        '/api/allocations/assessment-types/',
        '/api/allocations/co-assessment-mappings/',
        # Marks
        '/api/marks/student-marks/',
        '/api/marks/student-question-marks/',
        # Students
        '/api/students/',
        # Attainment
        '/api/attainment/co-attainments/',
        '/api/attainment/po-attainments/',
        '/api/attainment/pso-attainments/',
        '/api/attainment/action-taken-reports/',
    ]
    
    report = []
    
    for role, email in users_to_test.items():
        print(f"\n--- Testing as {role} ({email}) ---")
        login_res = c.post('/api/auth/login/', {'email': email, 'password': 'sece@123'})
        if login_res.status_code != 200:
            print(f"FAILED TO LOGIN: {login_res.status_code} - {login_res.content}")
            continue
        
        token = login_res.json().get('access')
        headers = {'HTTP_AUTHORIZATION': f'Bearer {token}'}
        
        for endpoint in endpoints:
            res = c.get(endpoint, **headers)
            status = res.status_code
            if status >= 400 and status != 403: # 403 is expected for roles that lack permission
                error_msg = res.content.decode('utf-8')[:200]
                report.append(f"BUG [{role}] GET {endpoint} returned {status}: {error_msg}")
                print(f"ERROR: {endpoint} -> {status}")
            else:
                print(f"OK ({status}): {endpoint}")
                
    with open('bug_report_internal.txt', 'w') as f:
        if report:
            f.write("\n".join(report))
        else:
            f.write("No 400/500 errors found in standard endpoints.")

test_endpoints()
