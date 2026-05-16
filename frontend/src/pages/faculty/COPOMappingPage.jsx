import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectService, analyticsService } from '../../services/api';
import Card from '../../components/ui/Card';
import { Save, ArrowLeft, Loader2, Info, HelpCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function COPOMappingPage() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mappings, setMappings] = useState({});

  const { data: subjectData, isLoading: isSubLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
    onSuccess: (res) => {
      // Initialize mappings from existing data
      const existing = {};
      res.data.course_outcomes?.forEach(co => {
        co.po_mappings?.forEach(m => {
          existing[`${co.id}-${m.po_id}`] = m.correlation_level;
        });
      });
      setMappings(existing);
    }
  });

  const { data: poData, isLoading: isPOLoading } = useQuery({
    queryKey: ['programme-pos', subjectData?.data?.programme_id],
    queryFn: () => subjectService.getProgrammePOs(subjectData?.data?.programme_id),
    enabled: !!subjectData?.data?.programme_id,
    select: (res) => res.data
  });

  const saveMutation = useMutation({
    mutationFn: (data) => subjectService.saveCOPOMappings(allocId, data),
    onSuccess: () => {
      toast.success('CO-PO Mappings saved successfully');
      queryClient.invalidateQueries(['subject-allocation', allocId]);
      navigate(`/faculty/subjects/${allocId}`);
    }
  });

  const handleLevelChange = (coId, poId, level) => {
    setMappings(prev => ({
      ...prev,
      [`${coId}-${poId}`]: level === prev[`${coId}-${poId}`] ? 0 : level
    }));
  };

  if (isSubLoading || isPOLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const cos = subjectData?.data?.course_outcomes || [];
  const pos = poData || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">CO-PO Mapping Matrix</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
          <HelpCircle size={20} />
        </div>
        <div className="text-sm">
          <p className="font-bold text-amber-900">Correlation Levels</p>
          <p className="text-amber-700 mt-1">1: Low Correlation | 2: Medium Correlation | 3: High Correlation. Leave blank for no correlation.</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border-none shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-4 text-left border-r border-slate-800 sticky left-0 z-10 bg-slate-900 min-w-[200px]">Course Outcomes</th>
                {pos.map(po => (
                  <th key={po.id} className="p-4 text-center border-r border-slate-800 min-w-[60px]" title={po.description}>
                    {po.po_code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cos.map(co => (
                <tr key={co.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                  <td className="p-4 border-r border-gray-100 sticky left-0 z-10 bg-white group-hover:bg-slate-50">
                    <div className="font-bold text-sm text-slate-900">{co.co_code}</div>
                    <div className="text-[10px] text-gray-500 truncate max-w-[180px]">{co.description}</div>
                  </td>
                  {pos.map(po => {
                    const currentLevel = mappings[`${co.id}-${po.id}`] || 0;
                    return (
                      <td key={po.id} className="p-2 border-r border-gray-100 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {[1, 2, 3].map(level => (
                            <button
                              key={level}
                              onClick={() => handleLevelChange(co.id, po.id, level)}
                              className={`w-8 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all ${
                                currentLevel === level 
                                ? 'bg-blue-600 text-white shadow-md scale-110' 
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end pt-4">
        <button 
          onClick={() => saveMutation.mutate(mappings)}
          disabled={saveMutation.isPending}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
          Save Mapping Matrix
        </button>
      </div>
    </div>
  );
}
