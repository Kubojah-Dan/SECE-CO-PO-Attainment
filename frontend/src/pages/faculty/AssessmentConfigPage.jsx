import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectService, allocationService } from '../../services/api';
import Card from '../../components/ui/Card';
import { ArrowLeft, Loader2, Save, Settings2, Info } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AssessmentConfigPage() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['assessments', allocId],
    queryFn: () => allocationService.getAssessments(allocId),
    select: (res) => res.data
  });

  const updateMutation = useMutation({
    mutationFn: ({ typeId, data }) => allocationService.updateAssessment(allocId, typeId, data),
    onSuccess: () => {
      toast.success('Assessment configuration updated');
      queryClient.invalidateQueries(['assessments', allocId]);
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">Assessment Setup</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Configure max marks and weightage</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex items-center justify-between shadow-xl">
        <div>
          <h3 className="text-xl font-bold">Standard OBE weights</h3>
          <p className="text-slate-400 text-sm mt-1">Direct attainment is calculated as 80% (Internal) + 20% (External) by default.</p>
        </div>
        <div className="p-4 bg-white/10 rounded-2xl">
          <Settings2 size={32} className="text-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {configs?.map((cfg) => (
          <Card key={cfg.id} className="flex items-center justify-between group hover:border-blue-100 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                {cfg.assessment_type_code}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{cfg.assessment_type_name}</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Threshold: {cfg.threshold_pct}%</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Max Marks</label>
                <input 
                  type="number"
                  className="form-input w-24 text-center font-bold"
                  defaultValue={cfg.max_marks}
                  onBlur={(e) => updateMutation.mutate({ typeId: cfg.id, data: { max_marks: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Weight (%)</label>
                <input 
                  type="number"
                  className="form-input w-24 text-center font-bold"
                  defaultValue={cfg.weightage}
                  onBlur={(e) => updateMutation.mutate({ typeId: cfg.id, data: { weightage: e.target.value } })}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-4">
        <Info className="text-blue-600 mt-0.5" size={18} />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Note:</strong> These settings impact how CO attainment is calculated. Ensure the total internal weightage sums up to 100% as per department guidelines.
        </p>
      </div>
    </div>
  );
}
