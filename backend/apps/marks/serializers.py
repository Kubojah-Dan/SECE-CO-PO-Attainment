from rest_framework import serializers
from .models import StudentMark, QuestionCOMapping, StudentQuestionMark, ExcelUploadLog

class StudentMarkSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_roll = serializers.CharField(source='student.roll_number', read_only=True)

    class Meta:
        model = StudentMark
        fields = '__all__'


class ExcelUploadLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExcelUploadLog
        fields = '__all__'


class QuestionCOMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionCOMapping
        fields = '__all__'


class StudentQuestionMarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentQuestionMark
        fields = '__all__'
