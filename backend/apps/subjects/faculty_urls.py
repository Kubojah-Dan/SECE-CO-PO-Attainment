from django.urls import path
from apps.marks.views import FacultySubjectViewSet

urlpatterns = [
    path('my-subjects/', FacultySubjectViewSet.as_view({'get': 'list'}), name='faculty-my-subjects'),
]
