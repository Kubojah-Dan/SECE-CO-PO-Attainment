import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { 
  BookMarked, User, Layout, CheckCircle, XCircle, 
  Clock, Plus, X, Search, Save, Loader2 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  allocationService, subjectService, 
  userService, departmentService 
} from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useSelection } from '../../contexts/SelectionContext';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function HODSubjectsList() {
  const { user } = useAuth();
  const { selectedAY } = useSelection();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['hod', 'allocations', selectedAY],
    queryFn: () => allocationService.getAllocations({ 
      subject__department: user?.department_id,
      academic_year: selectedAY 
    }),
    select: (res) => res.data.results || res.data
  });

  const { data: subjects } = useQuery({
    queryKey: ['hod', 'subjects', user?.department_id],
    queryFn: () => subjectService.list({ department: user?.department_id }),
    enabled: isModalOpen,
    select: (res) => res.data.results || res.data
  });

  const { data: faculty } = useQuery({
    queryKey: ['hod', 'faculty', user?.department_id],
    queryFn: () => userService.getFaculty({ faculty_profile__department: user?.department_id }),
    enabled: isModalOpen,
    select: (res) => res.data.results || res.data
  });

  const { data: sections } = useQuery({
    queryKey: ['hod', 'sections', user?.department_id],
    queryFn: () => departmentService.listSections({ batch__programme__department: user?.department_id }),
    enabled: isModalOpen,
    select: (res) => res.data.results || res.data
  });

  const createMutation = useMutation({
    mutationFn: (data) => allocationService.create(data),
    onSuccess: () => {
      toast.success('Subject allocated successfully');
      queryClient.invalidateQueries(['hod', 'allocations']);
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to allocate subject');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      subject: formData.get('subject'),
      faculty: formData.get('faculty'),
      section: formData.get('section'),
      academic_year: selectedAY
    };
    createMutation.mutate(data);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-wider"><CheckCircle size={10} /> Approved</span>;
      case 'REJECTED':
        return <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wider"><XCircle size={10} /> Rejected</span>;
      default:
        return <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-wider"><Clock size={10} /> Pending</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Department Subjects</h1>
          <p className="text-sm text-gray-500">Assign and monitor subject allocations for {user?.department_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector align="right" />
          <button 
            onClick={() => {
              queryClient.invalidateQueries(['hod', 'faculty']);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            Assign Subject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allocations?.length > 0 ? allocations.map((alloc) => (
          <Card key={alloc.id} className="group hover:border-blue-200 transition-all border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <BookMarked size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{alloc.subject_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {alloc.subject_code}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 uppercase tracking-widest">
                      <Layout size={10} /> Section {alloc.section_name}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(alloc.approval_status)}
                <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 uppercase tracking-widest">
                  <User size={12} className="text-gray-400" />
                  <span>{alloc.faculty_name}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex gap-6">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Semester</p>
                  <p className="text-sm font-bold text-slate-800">{alloc.semester}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">Readiness</p>
                  <p className={`text-sm font-bold ${alloc.attainment_level >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
                    {alloc.attainment_level ? `Level ${alloc.attainment_level}` : 'Pending'}
                  </p>
                </div>
              </div>
              
              <Link 
                to={`/hod/co-attainment?subject_allocation=${alloc.id}`} 
                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-2 decoration-blue-100"
              >
                View Faculty Log
              </Link>
            </div>
          </Card>
        )) : (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
            <BookMarked size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">No subjects allocated for the selected academic year.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-4 text-blue-600 font-bold hover:underline"
            >
              Start by assigning a subject
            </button>
          </div>
        )}
      </div>

      {/* Allocation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg p-0 overflow-hidden border-none shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-bold text-gray-900 font-display">Allocate New Subject</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-gray-50/50">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Select Subject</label>
                <select name="subject" required className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold">
                  <option value="">Choose a subject...</option>
                  {subjects?.map(s => (
                    <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Assign to Faculty</label>
                <select name="faculty" required className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold">
                  <option value="">Choose a faculty member...</option>
                  {faculty?.map(f => (
                    <option key={f.id} value={f.faculty_profile?.id}>{f.first_name} {f.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Section</label>
                <select name="section" required className="w-full p-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold">
                  <option value="">Choose a section...</option>
                  {sections?.map(s => (
                    <option key={s.id} value={s.id}>{s.programme_name} - Sec {s.name} ({s.batch_label})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Confirm Allocation
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
