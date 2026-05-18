from django.urls import path
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok", "message": "SECE CO-PO Backend is running"})

urlpatterns = [
    path('', health_check, name='health-check'),
]
