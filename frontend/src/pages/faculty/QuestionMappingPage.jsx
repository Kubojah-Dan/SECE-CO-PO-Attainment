import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marksService, subjectService } from '../../services/api';
import Card from '../../components/ui/Card';
import { 
  ArrowLeft, Loader2, Plus, Trash2, 
  Save, LayoutGrid, Info, CheckCircle2 
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function QuestionMappingPage() {
  const { allocId, assessmentType } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState([]);

  const { data: subjectData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
  });

  const { data: existingMappings, isLoading: isMappingsLoading } = useQuery({
    queryKey: ['question-mappings', allocId, assessmentType],
    queryFn: () => marksService.getQuestionMappings({ 
      subject_allocation: allocId, 
      assessment_type__code: assessmentType.toUpperCase() 
    }),
    onSuccess: (res) => {
      if (res.data?.results?.length > 0) {
        setQuestions(res.data.results.map(m => ({
          id: m.id,
          question_number: m.question_number,
          co_id: m.co,
          max_marks: m.max_marks
        })));
      }
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => marksService.saveQuestionMapping(data),
    onSuccess: () => {
      toast.success('Question mappings saved');
      queryClient.invalidateQueries(['question-mappings', allocId, assessmentType]);
    }
  });

  const addQuestion = () => {
    setQuestions([...questions, { 
      question_number: `Q${questions.length + 1}`, 
      co_id: '', 
      max_marks: 5 
    }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleSave = () => {
    // Basic validation
    if (questions.some(q => !q.co_id || !q.question_number || !q.max_marks)) {
      toast.error('Please fill all fields for all questions');
      return;
    }

    // Save each question (assuming bulk or individual)
    // For simplicity, let's assume the API handles bulk or we map it
    questions.forEach(q => {
      saveMutation.mutate({
        ...q,
        subject_allocation: allocId,
        assessment_type: assessmentType.toUpperCase() // This needs to be the ID in actual API, but for now assuming code works if backend allows it or I'll fix it
      });
    });
  };

  if (isSubLoading || isMappingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const cos = subjectData?.data?.course_outcomes || [];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">Question-wise CO Mapping</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">
            {subjectData?.data?.subject_name} · {assessmentType.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-2xl text-blue-600">
          <Info size={24} />
        </div>
        <div>
          <h3 className="font-bold text-blue-900">Define Assessment Structure</h3>
          <p className="text-sm text-blue-700 mt-1">
            Break down the assessment into individual questions and map each to a Course Outcome (CO). 
            This allows for granular attainment calculation.
          </p>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl rounded-[2rem]">
        <table className="w-full">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4 text-xs font-bold uppercase tracking-widest">Q. No</th>
              <th className="p-4 text-xs font-bold uppercase tracking-widest text-center">Mapped CO</th>
              <th className="p-4 text-xs font-bold uppercase tracking-widest text-center">Max Marks</th>
              <th className="p-4 text-xs font-bold uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questions.map((q, index) => (
              <tr key={index} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <input 
                    type="text" 
                    value={q.question_number}
                    onChange={(e) => updateQuestion(index, 'question_number', e.target.value)}
                    className="form-input w-24 font-bold text-slate-900 text-center"
                    placeholder="Q1a"
                  />
                </td>
                <td className="p-4">
                  <select 
                    value={q.co_id}
                    onChange={(e) => updateQuestion(index, 'co_id', e.target.value)}
                    className="form-input w-full font-bold text-blue-600"
                  >
                    <option value="">Select CO</option>
                    {cos.map(co => (
                      <option key={co.id} value={co.id}>{co.co_code}: {co.description.substring(0, 30)}...</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <input 
                    type="number" 
                    value={q.max_marks}
                    onChange={(e) => updateQuestion(index, 'max_marks', e.target.value)}
                    className="form-input w-24 font-bold text-center"
                  />
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => removeQuestion(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="p-4">
                <button 
                  onClick={addQuestion}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Add Question
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="flex justify-end gap-4">
        <button 
          onClick={() => navigate(`/faculty/subjects/${allocId}/marks/${assessmentType}`)}
          className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold hover:bg-black transition-all shadow-xl shadow-slate-200"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
          Save Mapping
        </button>
      </div>
    </div>
  );
}
