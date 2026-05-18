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
        <p className="text-gray-500 font-medium animate-pulse">Loading subject architecture...</p>
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
      color: 'blue',
      complete: cosDefined >= 5
    },
    { 
      id: 'mapping', 
      title: 'CO-PO Mapping', 
      desc: 'Map COs to Program Outcomes & PSOs', 
      icon: Database, 
      to: 'co-po-mapping', 
      status: mappingsComplete ? 'Complete' : 'Incomplete', 
      color: 'purple',
      complete: mappingsComplete
    },
    { 
      id: 'assessments', 
      title: 'Assessment Config', 
      desc: 'Setup weightages for CIA, ESE, and Tasks', 
      icon: Plus, 
      to: 'assessments', 
      status: 'Configured', 
      color: 'amber',
      complete: true
    },
    { 
      id: 'marks', 
      title: 'Marks Entry', 
      desc: 'Bulk import or manual entry of student marks', 
      icon: Upload, 
      to: 'marks', 
      status: subject.marks_completion_pct === 100 ? 'Complete' : 'In Progress', 
      color: 'green',
      complete: subject.marks_completion_pct === 100
    },
    { 
      id: 'attainment', 
      title: 'Attainment Result', 
      desc: 'View calculated CO/PO attainment levels', 
      icon: Calculator, 
      to: 'co-attainment', 
      status: subject.has_attainment ? 'Available' : 'Pending Calculation', 
      color: 'indigo',
      complete: subject.has_attainment
    },
    { 
      id: 'reports', 
      title: 'Reports', 
      desc: 'Generate NBA/NAAC compliant reports', 
      icon: FileText, 
      to: 'reports', 
      status: subject.has_attainment ? 'Ready' : 'Locked', 
      color: 'gray',
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
            className="p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 font-display tracking-tight">
                {subject.subject_code}: {subject.subject_name}
              </h1>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                Sem {subject.semester}
              </span>
            </div>
            <p className="text-gray-500 mt-1 font-medium">
              Section {subject.section_name} · {subject.student_count} Students
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'CO Definition', value: `${cosDefined} COs`, icon: Settings, color: 'blue', sub: 'Min 5 Required' },
          { label: 'Mapping Status', value: mappingsComplete ? 'Mapped' : 'Pending', icon: Database, color: 'purple', sub: '12 POs / 2 PSOs' },
          { label: 'Marks Entry', value: `${subject.marks_completion_pct || 0}%`, icon: Upload, color: 'green', sub: 'All assessments' },
          { label: 'Attainment', value: subject.has_attainment ? 'Calculated' : 'Pending', icon: Calculator, color: 'indigo', sub: 'NBA Method 1' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 border-none shadow-xl shadow-slate-100/50 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700`} />
            <div className="flex items-center gap-4 relative">
              <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 shadow-sm`}>
                <stat.icon size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{stat.value}</p>
                <p className="text-[10px] text-gray-500 font-medium mt-1">{stat.sub}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actions.map((action) => (
          <Card 
            key={action.id} 
            className={`group cursor-pointer hover:shadow-2xl transition-all duration-500 border-2 ${action.complete ? 'border-transparent' : 'border-dashed border-gray-100'}`}
            onClick={() => navigate(action.to)}
          >
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-2xl bg-${action.color}-50 text-${action.color}-600 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
                <action.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{action.title}</h3>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">{action.desc}</p>
                <div className="flex items-center justify-between">
                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${action.complete ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
                    {action.status}
                   </span>
                   {action.complete && <CheckCircle2 size={14} className="text-green-500" />}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Dynamic Attainment Actions */}
      <div className="p-6 bg-slate-900 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-slate-200">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
            <Calculator size={24} />
          </div>
          <div>
            <h4 className="font-bold text-white">
              {subject.has_attainment ? 'Attainment Results Available' : 'Calculate Attainment Now'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {subject.has_attainment 
                ? 'Your NBA Method 1 attainment report is compiled and ready.' 
                : 'Auto-generate course attainment using standard OBE marks integration.'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {calculateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
          {subject.has_attainment ? 'Recalculate Attainment' : 'Calculate Now'}
        </button>
      </div>
    </div>
  );
}

