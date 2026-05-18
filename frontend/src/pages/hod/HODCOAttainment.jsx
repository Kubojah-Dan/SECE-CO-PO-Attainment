import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { 
  Calculator, Filter, Download, TrendingUp, AlertCircle, 
  CheckCircle, Loader2, ArrowLeft, ShieldAlert, Award, FileText, CheckCircle2, XCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { attainmentService, allocationService } from '../../services/api';
import AttainmentBadge from '../../components/ui/AttainmentBadge';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';
import { useSelection } from '../../contexts/SelectionContext';
import { toast } from 'react-toastify';

export default function HODCOAttainment() {
  const { selectedAY, setSelectedAY } = useSelection();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams(location.search);
  const subjectAllocationId = queryParams.get('subject_allocation');

  // Approval Form State
  const [approvalStatus, setApprovalStatus] = useState('APPROVED');
  const [remarks, setRemarks] = useState('');

  // Fetch CO data for HOD view
  const { data: rawResponse, isLoading, refetch } = useQuery({
    queryKey: ['hod', 'co-attainment', selectedAY, subjectAllocationId],
    queryFn: () => {
      if (subjectAllocationId) {
        return attainmentService.hodCOAttainment({ subject_allocation: subjectAllocationId });
      }
      return attainmentService.hodCOAttainment({ academic_year: selectedAY });
    },
  });

  // Fetch specific Subject Allocation details if selected
  const { data: allocationDetail, isLoading: isAllocationLoading } = useQuery({
    queryKey: ['hod', 'subject-allocation-detail', subjectAllocationId],
    queryFn: () => allocationService.getAllocations({ id: subjectAllocationId }),
    enabled: !!subjectAllocationId,
    select: (res) => {
      const list = res.data?.results || res.data || [];
      return list.find(a => a.id?.toString() === subjectAllocationId?.toString());
    }
  });

  const coData = rawResponse?.data;
  const safeData = Array.isArray(coData) 
    ? coData 
    : (Array.isArray(coData?.results) ? coData.results : []);

  // Pre-fill remarks and status if allocationDetail changes
  useEffect(() => {
    if (allocationDetail) {
      setApprovalStatus(allocationDetail.approval_status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
      setRemarks(allocationDetail.hod_remarks || '');
    }
  }, [allocationDetail]);

  // Approval Mutation
  const approveMutation = useMutation({
    mutationFn: (data) => allocationService.approve(subjectAllocationId, data),
    onSuccess: (res) => {
      toast.success(`Attainment data verified and ${approvalStatus.toLowerCase()} successfully.`);
      queryClient.invalidateQueries(['hod', 'co-attainment']);
      queryClient.invalidateQueries(['hod', 'subject-allocation-detail', subjectAllocationId]);
      queryClient.invalidateQueries(['hod', 'allocations']);
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to update approval status.');
    }
  });

  const handleApprovalSubmit = (e) => {
    e.preventDefault();
    approveMutation.mutate({
      status: approvalStatus,
      remarks: remarks
    });
  };

  if (isLoading || (subjectAllocationId && isAllocationLoading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const avgAttainment = safeData.length > 0 
    ? (safeData.reduce((s, c) => s + parseFloat(c.final_attainment || 0), 0) / safeData.length).toFixed(1)
    : '0.0';

  const targetsMet = safeData.filter(c => c.target_achieved).length;
  const targetsBelow = safeData.filter(c => !c.target_achieved).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="flex items-center gap-1.5 text-[10px] font-black text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 uppercase tracking-widest"><CheckCircle2 size={12} /> Approved</span>;
      case 'REJECTED':
        return <span className="flex items-center gap-1.5 text-[10px] font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 uppercase tracking-widest"><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest"><Clock size={12} /> Pending Verification</span>;
    }
  };

  // ─── Render 1: Single Subject Detailed View ──────────────────────────────────────────
  if (subjectAllocationId) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 font-ui">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={() => navigate('/hod/subjects')}
            className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest border border-slate-200 px-4 py-2 rounded-xl bg-white shadow-sm"
          >
            <ArrowLeft size={14} className="mr-2" /> Back to Subject Allocations
          </button>
          
          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight">Course File Verification</h1>
            <p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-widest">Verifying performance and target achievements</p>
          </div>
        </div>

        {/* Subject Detail Profile Card */}
        {allocationDetail && (
          <Card className="p-6 border-slate-100 shadow-md bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                  <FileText size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{allocationDetail.subject_name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {allocationDetail.subject_code}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Semester {allocationDetail.semester}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      • Section {allocationDetail.section_name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:items-end gap-2.5">
                <div className="flex items-center gap-2 text-[10px] text-slate-700 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 uppercase tracking-widest">
                  <span className="text-slate-400 font-medium">Faculty In-Charge:</span>
                  <span className="text-blue-700">{allocationDetail.faculty_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Status:</span>
                  {getStatusBadge(allocationDetail.approval_status)}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Dynamic metrics for the selected subject */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Subject Average Attainment" 
            value={`${avgAttainment}%`} 
            icon={TrendingUp} 
            color="blue"
          />
          <StatCard 
            title="Targets Achieved" 
            value={`${targetsMet} / ${safeData.length}`} 
            icon={CheckCircle} 
            color="green"
          />
          <StatCard 
            title="Overall Compliance" 
            value={parseFloat(avgAttainment) >= 65 ? 'High Compliance' : parseFloat(avgAttainment) >= 55 ? 'Medium Compliance' : 'Action Required'} 
            icon={Award} 
            color={parseFloat(avgAttainment) >= 65 ? 'purple' : parseFloat(avgAttainment) >= 55 ? 'indigo' : 'red'}
          />
        </div>

        {/* Course Outcomes Breakdown Table */}
        <Card className="p-0 overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
          <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Course Outcome (CO) Performance Log</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Individual CO Attainment Values</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white">
                  <th className="p-4">CO Code</th>
                  <th className="p-4">Direct Attainment (80%)</th>
                  <th className="p-4">Indirect Attainment (20%)</th>
                  <th className="p-4">Final Attainment (%)</th>
                  <th className="p-4 text-center">Attainment Level</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {safeData.length > 0 ? safeData.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{r.co_code}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px] font-medium">{r.description || r.co_description}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">{parseFloat(r.direct_attainment || 0).toFixed(1)}%</td>
                    <td className="p-4 text-sm font-medium text-slate-600">{parseFloat(r.indirect_attainment || 0).toFixed(1)}%</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{parseFloat(r.final_attainment || 0).toFixed(1)}%</span>
                        <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{width: `${r.final_attainment}%`}} />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <AttainmentBadge level={r.attainment_level} />
                    </td>
                    <td className="p-4 text-right">
                      {r.target_achieved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-widest">
                          <CheckCircle size={10} /> Target Met
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-widest">
                          <AlertCircle size={10} /> Below Target
                        </span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      No Course Outcomes parsed for this subject yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* HOD Verification & Verification Panel */}
        <Card className="p-8 border-none shadow-2xl bg-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
          <h3 className="text-lg font-bold text-slate-900 font-display mb-2 flex items-center gap-2">
            <CheckCircle2 className="text-blue-600 w-5 h-5" /> Course File Approval Decision
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-medium">Verify that the course file, CO-PO mappings, student marks, and overall attainment metrics meet the departmental standards.</p>

          <form onSubmit={handleApprovalSubmit} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Radio buttons for status */}
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Approval Decision</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setApprovalStatus('APPROVED')}
                    className={`flex items-center justify-center p-4 rounded-2xl border-2 font-bold text-sm transition-all gap-2 ${
                      approvalStatus === 'APPROVED' 
                        ? 'border-green-500 bg-green-50/20 text-green-700' 
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 size={16} /> Approve Course File
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalStatus('REJECTED')}
                    className={`flex items-center justify-center p-4 rounded-2xl border-2 font-bold text-sm transition-all gap-2 ${
                      approvalStatus === 'REJECTED' 
                        ? 'border-red-500 bg-red-50/20 text-red-700' 
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <XCircle size={16} /> Reject & Return
                  </button>
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="flex-[2] flex flex-col space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">HOD Feedback & Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide comments on mappings, marks correctness, continuous assessment feedback, or reasons for rejection..."
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium h-[88px] resize-none"
                  required={approvalStatus === 'REJECTED'}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-50">
              <button
                type="submit"
                disabled={approveMutation.isPending}
                className={`flex items-center justify-center px-8 py-4 font-bold text-white rounded-2xl transition-all text-sm shadow-lg ${
                  approvalStatus === 'APPROVED' 
                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/10' 
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/10'
                }`}
              >
                {approveMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <CheckCircle2 size={16} className="mr-2" />
                )}
                Submit Verification Decision
              </button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // ─── Render 2: Consolidated Department Overview ──────────────────────────────────────
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-ui">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight">Department CO Attainment</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Consolidated Course Outcome performance for all subjects</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
          <button className="flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md">
            <Download size={14} className="mr-2" /> Export Summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total COs Tracked', value: safeData.length, icon: Calculator, color: 'blue' },
          { label: 'Avg Attainment', value: `${avgAttainment}%`, icon: TrendingUp, color: 'indigo' },
          { label: 'Targets Met', value: targetsMet, icon: CheckCircle, color: 'emerald' },
          { label: 'Below Target', value: targetsBelow, icon: AlertCircle, color: 'amber' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 border-none shadow-md bg-white">
            <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl w-fit mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-3xl font-black text-slate-900 leading-none">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest">Subject</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest">CO Code</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-center">Attainment (%)</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-center">Level</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {safeData.length > 0 ? safeData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 text-sm">{item.subject_code}</span>
                    <p className="text-[10px] text-gray-500 font-medium truncate max-w-[200px]">{item.subject_name}</p>
                  </td>
                  <td className="p-4 font-mono text-xs font-bold text-blue-600">{item.co_code}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-black text-slate-700">{parseFloat(item.final_attainment || 0).toFixed(1)}%</span>
                      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: `${item.final_attainment}%`}} />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <AttainmentBadge level={item.attainment_level} />
                  </td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      item.target_achieved 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.target_achieved ? 'Met' : 'Below'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    No CO attainment data available for the selected academic year
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
