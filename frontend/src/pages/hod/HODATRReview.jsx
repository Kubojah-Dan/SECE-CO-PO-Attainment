import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attainmentService, departmentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import { 
  CheckCircle2, AlertTriangle, MessageSquare, 
  Search, Filter, ChevronRight, Loader2, Save, XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function HODATRReview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAtr, setSelectedAtr] = useState(null);
  const [remarks, setRemarks] = useState('');

  const { data: atrs, isLoading } = useQuery({
    queryKey: ['hod-atrs', user?.department_id],
    queryFn: () => attainmentService.hodCOAttainment({ department: user?.department_id, needs_atr: true }),
    enabled: !!user?.department_id,
  });

  // Since the API for listing ATRs might be different, let's assume we can filter by department
  // For now, I'll mock the filter or use the existing ModelViewSet
  const { data: pendingAtrs, isLoading: isAtrLoading } = useQuery({
    queryKey: ['pending-atrs'],
    queryFn: () => attainmentService.getATR(), // Get all, filter later if needed
    select: (res) => res.data.filter(a => a.implementation_status === 'SUBMITTED')
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, data }) => attainmentService.saveATR(data.subject_allocation, data),
    onSuccess: () => {
      toast.success('Review submitted successfully');
      queryClient.invalidateQueries(['pending-atrs']);
      setSelectedAtr(null);
      setRemarks('');
    }
  });

  const handleApprove = (atr) => {
    reviewMutation.mutate({
      id: atr.id,
      data: {
        ...atr,
        implementation_status: 'REVIEWED',
        hod_remarks: remarks
      }
    });
  };

  if (isLoading || isAtrLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">ATR Review Center</h1>
        <p className="text-slate-500 mt-1">Review and approve Action Taken Reports submitted by faculty for low attainment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Pending ATRs */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Pending Reviews</h3>
          {pendingAtrs?.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <CheckCircle2 size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">All caught up!</p>
            </div>
          ) : (
            pendingAtrs?.map((atr) => (
              <button
                key={atr.id}
                onClick={() => {
                  setSelectedAtr(atr);
                  setRemarks(atr.hod_remarks || '');
                }}
                className={`w-full text-left p-5 rounded-[2rem] transition-all border ${
                  selectedAtr?.id === atr.id 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]' 
                  : 'bg-white text-slate-900 border-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${
                    selectedAtr?.id === atr.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {atr.subject_code || 'SUBJECT'}
                  </span>
                  <AlertTriangle size={16} className={selectedAtr?.id === atr.id ? 'text-amber-400' : 'text-amber-500'} />
                </div>
                <h4 className="font-bold mt-2 line-clamp-1">{atr.subject_name || 'Subject Name'}</h4>
                <p className={`text-[10px] mt-1 uppercase font-bold tracking-widest ${
                  selectedAtr?.id === atr.id ? 'text-slate-400' : 'text-slate-400'
                }`}>
                  Section {atr.section_name} · {atr.faculty_name}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2">
          {selectedAtr ? (
            <div className="space-y-6">
              <Card className="p-8 border border-gray-200 rounded-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">ATR Analysis</h2>
                      <p className="text-xs text-slate-500 font-medium">Submitted on {new Date(selectedAtr.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAtr.low_performing_cos?.map(co => (
                      <span key={co} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-100">
                        {co}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} /> Root Cause Analysis
                    </h4>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                      "{selectedAtr.root_cause}"
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <Zap size={14} /> Proposed Corrective Actions
                    </h4>
                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 text-sm text-slate-800 leading-relaxed font-medium">
                      {selectedAtr.proposed_actions}
                    </div>
                  </section>

                  <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <MessageSquare size={14} /> HOD Remarks & Guidance
                    </h4>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter your feedback, suggestions, or approval notes here..."
                      className="w-full min-h-[120px] p-6 bg-white border-2 border-slate-100 rounded-3xl focus:border-slate-900 focus:ring-0 transition-all text-sm outline-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => handleApprove(selectedAtr)}
                      disabled={reviewMutation.isPending}
                      className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center font-bold transition-colors"
                    >
                      {reviewMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={20} className="mr-2" />}
                      Approve ATR
                    </button>
                    <button
                      className="px-6 py-4 bg-white border border-slate-200 text-red-600 rounded-2xl flex items-center justify-center font-bold hover:bg-red-50 transition-all"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-[3rem] border border-slate-100 border-dashed min-h-[500px]">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Select an ATR to Review</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">Choose a submitted report from the left sidebar to see the full analysis and provide feedback.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { FileText, Zap } from 'lucide-react';
