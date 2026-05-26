import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectService } from '../../services/api';
import Card from '../../components/ui/Card';
import { Plus, Trash2, Save, ArrowLeft, Loader2, Info } from 'lucide-react';
import { toast } from 'react-toastify';

const BLOOMS_LEVELS = [
  'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'
];

export default function CODefinitionPage() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cos, setCos] = useState([]);

  const { data: subjectData, isLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
  });

  useEffect(() => {
    if (subjectData?.data) {
      if (subjectData.data.course_outcomes?.length > 0) {
        setCos(subjectData.data.course_outcomes);
      } else {
        // Default 5 COs
        setCos(Array(5).fill(0).map((_, i) => ({
          co_number: i + 1,
          co_code: `CO${i + 1}`,
          description: '',
          bloom_level: 'Apply'
        })));
      }
    }
  }, [subjectData]);

  const saveMutation = useMutation({
    mutationFn: (data) => subjectService.saveCOs(allocId, data),
    onSuccess: () => {
      toast.success('Course Outcomes saved successfully');
      queryClient.invalidateQueries(['subject-allocation', allocId]);
      navigate(`/faculty/subjects/${allocId}`);
    },
    onError: () => {
      toast.error('Failed to save COs');
    }
  });

  const handleAddCO = () => {
    const nextNum = cos.length + 1;
    setCos([...cos, {
      co_number: nextNum,
      co_code: `CO${nextNum}`,
      description: '',
      bloom_level: 'Apply'
    }]);
  };

  const handleRemoveCO = (index) => {
    setCos(cos.filter((_, i) => i !== index));
  };

  const handleUpdateCO = (index, field, value) => {
    const newCos = [...cos];
    newCos[index][field] = value;
    setCos(newCos);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">Course Outcomes (CO)</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
          <Info size={20} />
        </div>
        <div className="text-sm">
          <p className="font-bold text-blue-900">NBA Requirement</p>
          <p className="text-blue-700 mt-1">Define clear, measurable Course Outcomes. Typically, a course has 5-6 COs mapped to different Bloom's levels.</p>
        </div>
      </div>

      <div className="space-y-4">
        {cos.map((co, index) => (
          <Card key={index} className="relative group">
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold font-mono">
                  {co.co_code}
                </span>
                <button 
                  onClick={() => handleRemoveCO(index)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Description</label>
                    <textarea 
                      className="form-input w-full min-h-[80px] text-sm resize-none"
                      placeholder="e.g., Apply the concepts of machine learning to solve real-world problems..."
                      value={co.description}
                      onChange={(e) => handleUpdateCO(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-48">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Bloom's Level</label>
                    <select 
                      className="form-input w-full text-sm"
                      value={co.bloom_level}
                      onChange={(e) => handleUpdateCO(index, 'bloom_level', e.target.value)}
                    >
                      {BLOOMS_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 pt-6">
        <button 
          onClick={handleAddCO}
          className="flex-1 py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all font-bold"
        >
          <Plus size={20} className="mr-2" /> Add Another CO
        </button>
        <button 
          onClick={() => saveMutation.mutate(cos)}
          disabled={saveMutation.isPending}
          className="flex-1 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold hover:bg-black transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
          Save Course Outcomes
        </button>
      </div>
    </div>
  );
}
