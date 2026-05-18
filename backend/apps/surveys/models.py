"""
SECE CO-PO Platform — Survey App Models
Indirect attainment tracking via student surveys.
"""
from django.db import models
from apps.authentication.models import User
from apps.allocations.models import SubjectAllocation
from apps.subjects.models import CourseOutcome

class SurveyTemplate(models.Model):
    """Template for surveys (Exit survey, alumni survey, etc.)"""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class SurveyResponse(models.Model):
    """Individual responses to surveys."""
    template = models.ForeignKey(SurveyTemplate, on_delete=models.CASCADE, related_name='responses')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='survey_responses')
    subject_allocation = models.ForeignKey(SubjectAllocation, on_delete=models.CASCADE, related_name='survey_responses')
    co = models.ForeignKey(CourseOutcome, on_delete=models.CASCADE, related_name='survey_responses')
    rating = models.IntegerField()  # 1 to 3
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['student', 'subject_allocation', 'co']]
