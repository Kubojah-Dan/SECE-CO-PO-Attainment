from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from .excel_generators import (
    generate_nba_attainment_report,
    generate_marks_template,
    generate_student_template,
    generate_subject_template,
    generate_co_summary_report,
    generate_consolidated_marks_report
)

class GenerateReportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, alloc_id=None):
        report_type = request.data.get('type')
        allocation_id = alloc_id or request.data.get('allocation_id')
        
        if not allocation_id:
            return Response({"error": "Allocation ID is required"}, status=400)

        try:
            if report_type == 'attainment_matrix':
                excel_data = generate_nba_attainment_report(allocation_id)
                filename = f"NBA_Attainment_Report_{allocation_id}.xlsx"
            elif report_type == 'co_summary':
                excel_data = generate_co_summary_report(allocation_id)
                filename = f"CO_Attainment_Summary_{allocation_id}.xlsx"
            elif report_type == 'marks_report':
                excel_data = generate_consolidated_marks_report(allocation_id)
                filename = f"Consolidated_Marks_{allocation_id}.xlsx"
            else:
                return Response({"message": "Invalid report type"}, status=400)
                
            response = HttpResponse(
                excel_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class TemplateGenerationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        template_type = request.query_params.get('type')
        
        try:
            if template_type == 'marks':
                # For generic template, we use a dummy or first available if no alloc_id provided
                # But marks usually need an allocation. We'll return a generic student list if possible.
                # For now, let's just return generate_marks_template if allocation provided
                alloc_id = request.query_params.get('allocation')
                assess_code = request.query_params.get('assessment', 'CIA1')
                if alloc_id:
                    excel_data = generate_marks_template(alloc_id, assess_code)
                else:
                    return Response({"error": "allocation_id required for marks template"}, status=400)
            elif template_type == 'students':
                excel_data = generate_student_template()
            elif template_type == 'subjects':
                excel_data = generate_subject_template()
            else:
                return Response({"error": "Invalid template type"}, status=400)

            filename = f"{template_type}_template.xlsx"
            response = HttpResponse(
                excel_data,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class MasterInstitutionalReportView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # This would aggregate data across all departments
        # For now, we return a placeholder or a partial export
        return Response({"message": "Master report generation initiated. You will receive a notification when ready."}, status=202)
