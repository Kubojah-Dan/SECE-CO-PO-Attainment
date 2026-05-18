from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from apps.authentication.models import User
from .serializers import UserCreateUpdateSerializer

class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD for users (Faculty, HOD, IQAC).
    """
    queryset = User.objects.all().order_by('first_name')
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['role', 'is_active', 'faculty_profile__department']

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Admin force reset user password."""
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save()
        return Response({'message': f'Password for {user.email} reset successfully.'})

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """Bulk import users (Faculty, HOD) via Excel or CSV with robust fuzzy header matching."""
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
            
        import pandas as pd
        import math
        from apps.departments.models import Department
        from apps.users.models import FacultyProfile, HODProfile
        
        try:
            if file_obj.name.endswith('.csv'):
                df = pd.read_csv(file_obj)
            else:
                df = pd.read_excel(file_obj)
        except Exception as e:
            return Response({'error': f'Failed to parse file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Dynamic fuzzy column mapping
        headers = {str(c).strip(): str(c).lower().strip().replace(' ', '_').replace('.', '').replace('_', '') for c in df.columns}
        
        def find_fuzzy_col(key_patterns):
            for orig_name, normalized in headers.items():
                if any(pat in normalized for pat in key_patterns):
                    return orig_name
            return None
            
        email_col = find_fuzzy_col(['email', 'mail'])
        first_name_col = find_fuzzy_col(['firstname', 'first'])
        full_name_col = find_fuzzy_col(['fullname', 'name'])
        last_name_col = find_fuzzy_col(['lastname', 'last', 'surname'])
        role_col = find_fuzzy_col(['role', 'type', 'position'])
        phone_col = find_fuzzy_col(['phone', 'mobile', 'contact'])
        dept_col = find_fuzzy_col(['dept', 'department'])
        emp_id_col = find_fuzzy_col(['empid', 'employeeid', 'emp'])
        desig_col = find_fuzzy_col(['designation', 'title'])
        qual_col = find_fuzzy_col(['qualification', 'qual'])
        exp_col = find_fuzzy_col(['experience', 'exp'])
        spec_col = find_fuzzy_col(['specialization', 'spec'])

        # Validate minimum requirements
        if not email_col:
            return Response({'error': 'Could not identify Email column in the uploaded file.'}, status=status.HTTP_400_BAD_REQUEST)
        if not first_name_col and not full_name_col:
            return Response({'error': 'Could not identify Name or First Name column in the uploaded file.'}, status=status.HTTP_400_BAD_REQUEST)
            
        created_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                with transaction.atomic():
                    email = str(row[email_col]).strip().lower()
                    if not email or email == 'nan':
                        continue
                        
                    # Extract name fields
                    first_name = ''
                    last_name = ''
                    
                    if first_name_col:
                        first_name = str(row[first_name_col]).strip()
                        if last_name_col:
                            last_name = str(row[last_name_col]).strip()
                    elif full_name_col:
                        full_name = str(row[full_name_col]).strip()
                        parts = full_name.split(None, 1)
                        first_name = parts[0]
                        if len(parts) > 1:
                            last_name = parts[1]
                            
                    # Clean strings
                    if first_name == 'nan': first_name = ''
                    if last_name == 'nan': last_name = ''
                    
                    # Extract role
                    role = 'faculty'
                    if role_col:
                        role = str(row[role_col]).strip().lower()
                        
                    # Map role robustly
                    role_mapped = None
                    if 'faculty' in role or 'prof' in role or 'teach' in role:
                        role_mapped = User.Role.FACULTY
                    elif 'hod' in role or 'head' in role:
                        role_mapped = User.Role.HOD
                    elif 'iqac' in role or 'quality' in role:
                        role_mapped = User.Role.IQAC
                    elif 'admin' in role or 'super' in role:
                        role_mapped = User.Role.ADMIN
                    else:
                        role_mapped = User.Role.FACULTY  # Resilient fallback
                    
                    # Extract phone
                    phone = ''
                    if phone_col:
                        phone = str(row[phone_col]).strip()
                        if phone == 'nan': phone = ''
                    
                    # Check for existing user
                    if User.objects.filter(email=email).exists():
                        errors.append({'row': idx + 2, 'email': email, 'error': 'User with this email already exists'})
                        continue
                        
                    # Create user
                    user = User.objects.create_user(
                        email=email,
                        first_name=first_name or 'Faculty',
                        last_name=last_name,
                        role=role_mapped,
                        phone=phone,
                        is_active=True
                    )
                    user.set_password("sece@123") # Default password
                    user.save()
                    
                    # Handle department association
                    dept = None
                    if dept_col:
                        dept_str = str(row[dept_col]).strip()
                        if dept_str and dept_str != 'nan':
                            dept = Department.objects.filter(short_name__iexact=dept_str).first() or \
                                   Department.objects.filter(name__icontains=dept_str).first()
                    
                    # Extract profile attributes
                    employee_id = ''
                    if emp_id_col:
                        employee_id = str(row[emp_id_col]).strip()
                    if not employee_id or employee_id == 'nan':
                        employee_id = f"EMP{user.id}"
                        
                    designation = 'Assistant Professor'
                    if desig_col:
                        designation = str(row[desig_col]).strip()
                    if not designation or designation == 'nan':
                        designation = 'Assistant Professor'
                    
                    if role_mapped == User.Role.FACULTY:
                        qualification = 'M.E.'
                        if qual_col:
                            qualification = str(row[qual_col]).strip()
                        if not qualification or qualification == 'nan':
                            qualification = 'M.E.'
                            
                        exp = 0
                        if exp_col:
                            exp_str = str(row[exp_col]).strip()
                            try:
                                exp = int(float(exp_str)) if exp_str and exp_str != 'nan' else 0
                            except ValueError:
                                exp = 0
                                
                        specialization = ''
                        if spec_col:
                            specialization = str(row[spec_col]).strip()
                        if not specialization or specialization == 'nan':
                            specialization = ''
                        
                        FacultyProfile.objects.create(
                            user=user,
                            department=dept,
                            employee_id=employee_id,
                            designation=designation,
                            qualification=qualification,
                            experience_years=exp,
                            specialization=specialization
                        )
                    elif role_mapped == User.Role.HOD:
                        since_val = 2020
                        HODProfile.objects.create(
                            user=user,
                            department=dept,
                            employee_id=employee_id,
                            designation=designation,
                            since_year=since_val
                        )
                    created_count += 1
                    
            except Exception as e:
                errors.append({'row': idx + 2, 'error': str(e)})
                
        return Response({
            'message': f'{created_count} users imported successfully.',
            'created_count': created_count,
            'errors': errors
        }, status=status.HTTP_201_CREATED)
