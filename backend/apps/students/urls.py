from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, BatchMigrationView

router = DefaultRouter()
router.register(r'students', StudentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # S&H first-year batch migration — Admin/HOD only
    path('batch-migrate/', BatchMigrationView.as_view(), name='student-batch-migrate'),
]
