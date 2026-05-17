import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attainmentService, subjectService } from '../../services/api';
import Card from '../../components/ui/Card';
import { ArrowLeft, Loader2, Save, FileText, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ActionTakenReport() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [atrData, setAtrData] = useState({
    root_cause: '',
    proposed_actions: '',
    action_type: 'Remedial',
    implementation_status: 'DRAFT',
    low_performing_cos: []
  });

  const { data: subjectData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
  });

  const { data: existingAtr, isLoading: isAtrLoading } = useQuery({
    queryKey: ['atr', allocId],
    queryFn: () => attainmentService.getATR(allocId),
    onSuccess: (res) => {
      if (res.data) setAtrData(res.data);
    }
  });

  const { data: lowCOs } = useQuery({
    queryKey: ['attainment', allocId],
    queryFn: () => attainmentService.getCOAttainment(allocId),
    select: (res) => res.data.filter(r => !r.target_achieved),
    onSuccess: (data) => {
      if (!atrData.low_performing_cos?.length) {
        setAtrData(prev => ({...prev, low_performing_cos: data.map(c => c.co_code)}));
      }
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => attainmentService.saveATR(allocId, data),
    onSuccess: () => {
      toast.success('Action Taken Report saved');
      queryClient.invalidateQueries(['atr', allocId]);
    }
  });

  if (isSubLoading || isAtrLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">Action Taken Report (ATR)</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
        </div>
      </div>

      {lowCOs?.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-2xl text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-red-900">Low Attainment Detected</h3>
            <p className="text-sm text-red-700 mt-1">
              The following Course Outcomes are below the target attainment level. NBA requires a formal Action Taken Report to address these.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {lowCOs.map(co => {
                const isSelected = atrData.low_performing_cos?.includes(co.co_code);
                return (
                  <button
                    key={co.co_code}
                    onClick={() => {
                      const newCos = isSelected 
                        ? atrData.low_performing_cos.filter(c => c !== co.co_code)
                        : [...(atrData.low_performing_cos || []), co.co_code];
                      setAtrData({...atrData, low_performing_cos: newCos});
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm border transition-all flex items-center gap-2 ${
                      isSelected 
                      ? 'bg-red-600 text-white border-red-700' 
                      : 'bg-white text-red-600 border-red-100 hover:bg-red-50'
                    }`}
                  >
                    {isSelected && <CheckCircle2 size={10} />}
                    {co.co_code}: {parseFloat(co.final_attainment).toFixed(1)}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Card className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Root Cause Analysis</label>
            <textarea 
              className="form-input w-full min-h-[120px] text-sm"
              placeholder="Explain why the target attainment was not achieved (e.g., student background, curriculum gap, etc.)"
              value={atrData.root_cause}
              onChange={(e) => setAtrData({...atrData, root_cause: e.target.value})}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Proposed Corrective Actions</label>
            <textarea 
              className="form-input w-full min-h-[120px] text-sm"
              placeholder="List the specific actions to be taken in the next academic cycle to improve attainment."
              value={atrData.proposed_actions}
              onChange={(e) => setAtrData({...atrData, proposed_actions: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Action Type</label>
              <select 
                className="form-input w-full text-sm"
                value={atrData.action_type}
                onChange={(e) => setAtrData({...atrData, action_type: e.target.value})}
              >
                <option value="Remedial">Remedial Classes</option>
                <option value="Curriculum">Curriculum Enrichment</option>
                <option value="Pedagogy">Pedagogical Improvement</option>
                <option value="Assessment">Assessment Redesign</option>
                <option value="Content">Content Beyond Syllabus</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Implementation Status</label>
              <div className="flex items-center h-12 gap-2">
                <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${
                  atrData.implementation_status === 'SUBMITTED' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  {atrData.implementation_status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-50">
          <button 
            onClick={() => saveMutation.mutate({...atrData, implementation_status: 'DRAFT'})}
            disabled={saveMutation.isPending}
            className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl flex items-center justify-center font-bold hover:bg-gray-50 transition-all"
          >
            <FileText size={20} className="mr-2" /> Save Draft
          </button>
          <button 
            onClick={() => saveMutation.mutate({...atrData, implementation_status: 'SUBMITTED'})}
            disabled={saveMutation.isPending}
            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold hover:bg-black transition-all shadow-xl shadow-slate-200"
          >
            <Send size={20} className="mr-2" /> Submit to HOD
          </button>
        </div>
      </Card>

      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-slate-400" /> HOD Review Comments
        </h4>
        <p className="text-sm text-slate-500 mt-2 italic">
          {atrData.hod_remarks || "No remarks from HOD yet."}
        </p>
      </div>
    </div>
  );
}
