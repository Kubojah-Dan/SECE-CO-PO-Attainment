import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, BookMarked, Users, 
  Settings, Calculator, FileText, 
  ChevronRight, CheckCircle2, AlertCircle,
  Plus, Edit2, Upload, Database, Loader2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { subjectService, attainmentService } from '../../services/api';
import { toast } from 'react-toastify';

export default function SubjectDetail() {
  const { allocId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const calculateMutation = useMutation({
    mutationFn: () => attainmentService.calculate(allocId),
    onSuccess: () => {
      toast.success('Attainment calculation triggered successfully!');
      queryClient.invalidateQueries(['subject-allocation', allocId]);
    },
    onError: () => {
      toast.error('Failed to trigger attainment calculation');
    }
  });

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-gray-500 font-medium animate-pulse">Loading subject details...</p>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Subject Not Found</h2>
        <p className="text-gray-500 mt-2">The allocation ID might be invalid or you don't have permission to view it.</p>
        <button onClick={() => navigate('/faculty/subjects')} className="btn btn-primary mt-6">Back to Subjects</button>
      </div>
    );
  }

  const subject = response;
  const cosDefined = subject.course_outcomes?.length || 0;
  const mappingsComplete = subject.course_outcomes?.every(co => co.po_mappings?.length > 0) && cosDefined > 0;

  const actions = [
    { 
      id: 'cos', 
      title: 'Course Outcomes', 
      desc: 'Define and manage COs for this subject', 
      icon: Settings, 
      to: 'cos', 
      status: `${cosDefined} Defined`, 
      complete: cosDefined >= 5
    },
    { 
      id: 'mapping', 
      title: 'CO-PO Mapping', 
      desc: 'Map COs to Program Outcomes & PSOs', 
      icon: Database, 
      to: 'co-po-mapping', 
      status: mappingsComplete ? 'Complete' : 'Incomplete', 
      complete: mappingsComplete
    },
    { 
      id: 'assessments', 
      title: 'Assessment Setup', 
      desc: 'Configure weightages for CIA, ESE, and tasks', 
      icon: Plus, 
      to: 'assessments', 
      status: 'Configured', 
      complete: true
    },
    { 
      id: 'marks', 
      title: 'Marks Entry', 
      desc: 'Bulk import or manual entry of student marks', 
      icon: Upload, 
      to: 'marks', 
      status: subject.marks_completion_pct === 100 ? 'Complete' : 'In Progress', 
      complete: subject.marks_completion_pct === 100
    },
    { 
      id: 'attainment', 
      title: 'Attainment Result', 
      desc: 'View calculated CO/PO attainment levels', 
      icon: Calculator, 
      to: 'co-attainment', 
      status: subject.has_attainment ? 'Available' : 'Pending', 
      complete: subject.has_attainment
    },
    { 
      id: 'reports', 
      title: 'Course Reports', 
      desc: 'Generate NBA/NAAC compliant reports', 
      icon: FileText, 
      to: 'reports', 
      status: subject.has_attainment ? 'Ready' : 'Locked', 
      complete: subject.has_attainment
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => navigate('/faculty/subjects')}
            className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all text-gray-400 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {subject.subject_code}: {subject.subject_name}
              </h1>
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-widest border border-slate-200">
                Sem {subject.semester}
              </span>
            </div>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Section {subject.section_name} · {subject.student_count} Students
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CO Definition', value: `${cosDefined} COs`, icon: Settings, sub: 'Min 5 Required' },
          { label: 'Mapping Status', value: mappingsComplete ? 'Mapped' : 'Pending', icon: Database, sub: '12 POs / 2 PSOs' },
          { label: 'Marks Entry', value: `${subject.marks_completion_pct || 0}%`, icon: Upload, sub: 'All assessments' },
          { label: 'Attainment', value: subject.has_attainment ? 'Calculated' : 'Pending', icon: Calculator, sub: 'NBA Method 1' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                <stat.icon size={18} className="text-slate-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-0.5 truncate">{stat.value}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{stat.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => (
          <div
            key={action.id}
            className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-slate-400 transition-colors group"
            onClick={() => navigate(action.to)}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-100 transition-colors">
                <action.icon size={18} className="text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{action.title}</h3>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{action.desc}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border truncate ${
                    action.complete
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : 'bg-gray-50 text-gray-500 border-gray-100'
                  }`}>
                    {action.status}
                  </span>
                  {action.complete && <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attainment Actions Banner — flat light card */}
      <div className="p-6 bg-slate-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
            <Calculator size={18} className="text-slate-700" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm">
              {subject.has_attainment ? 'Attainment Results Available' : 'Calculate Attainment'}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              {subject.has_attainment 
                ? 'NBA Method 1 attainment report is compiled and ready.' 
                : 'Auto-generate course attainment using standard OBE marks integration.'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-slate-900"
        >
          {calculateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
          {subject.has_attainment ? 'Recalculate Attainment' : 'Calculate Now'}
        </button>
      </div>
    </div>
  );
}
