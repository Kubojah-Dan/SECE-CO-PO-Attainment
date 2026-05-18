from django.urls import path
from . import views

urlpatterns = [
    path('college-overview/', views.AdminCollegeOverviewView.as_view(), name='admin-college-overview'),
]
