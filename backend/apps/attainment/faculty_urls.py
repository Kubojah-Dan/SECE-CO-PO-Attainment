from django.urls import path
from . import views

urlpatterns = [
    path('calculate/', views.COAttainmentViewSet.as_view({'post': 'calculate'}), name='faculty-calculate-attainment'),
]
