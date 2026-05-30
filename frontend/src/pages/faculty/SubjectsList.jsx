import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookMarked, Search, Filter, 
  ChevronRight, Calendar, Users, 
  CheckCircle2, Clock, Calculator, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSelection } from '../../contexts/SelectionContext';
import { allocationService, attainmentService } from '../../services/api';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function SubjectsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedAY, setSelectedAY } = useSelection();
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [calculatingId, setCalculatingId] = useState(null);

  const calculateMutation = useMutation({
    mutationFn: (allocId) => {
      setCalculatingId(allocId);
      return attainmentService.calculate(allocId);
    },
    onSuccess: () => {
      toast.success('Attainment calculation queued successfully!');
      setCalculatingId(null);
    },
    onError: () => {
      toast.error('Failed to queue attainment calculation.');
      setCalculatingId(null);
    }
  });

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['faculty', 'my-subjects', selectedAY],
    queryFn: () => allocationService.mySubjects({ academic_year: selectedAY }),
    select: (res) => res.data,
  });

  const subjects = (Array.isArray(subjectsData) ? subjectsData : subjectsData?.results || []).filter(s => {
    const matchesSearch = s.subject_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedSemester !== 'All') {
      return matchesSearch && s.semester === parseInt(selectedSemester); 
    }
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const semesters = [...new Set((Array.isArray(subjectsData) ? subjectsData : subjectsData?.results || []).map(s => s.semester))].sort();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Subjects</h1>
          <p className="text-gray-500 mt-1">Manage your assigned course allocations and attainment</p>
        </div>
        <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} align="right" />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
            <Search size={18} strokeWidth={1.75} />
          </div>
          <input 
            type="text" 
            placeholder="Search by course code or name..."
            style={{ paddingLeft: '6rem' }}
            className="h-14 w-full rounded-xl border border-gray-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 text-sm font-medium transition-colors outline-none bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 px-4 rounded-xl">
          <Filter size={16} className="text-slate-400" strokeWidth={1.75} />
          <select 
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none pr-8 cursor-pointer"
          >
            <option value="All">All Semesters</option>
            {semesters.map(sem => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.length > 0 ? subjects.map((alloc) => (
          <Card 
            key={alloc.id} 
            className="group border border-gray-200 hover:border-slate-300 transition-colors cursor-pointer relative overflow-hidden"
            onClick={(e) => {
              if (e.target.closest('button')) return;
              navigate(`/faculty/subjects/${alloc.id}`);
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
                  <BookMarked size={22} strokeWidth={1.75} />
                </div>
                {alloc.marks_completion_pct === 100 ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-wider">
                    <CheckCircle2 size={10} /> Finalized
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">
                    <Clock size={10} /> Active
                  </span>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{alloc.subject_code}</h3>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{alloc.subject_name}</h2>
              </div>

              <div className="space-y-4 mt-auto">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Users size={16} /> <span>{alloc.student_count || 0} Students</span>
                  </div>
                  <div className="font-bold text-gray-900">Sem {alloc.semester}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500 font-medium">Mark Entry Completion</span>
                    <span className="font-bold text-gray-900">{alloc.marks_completion_pct || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${alloc.marks_completion_pct || 0}%` }}
                      className={`h-full rounded-full ${alloc.marks_completion_pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>

                 <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        calculateMutation.mutate(alloc.id);
                      }}
                      disabled={calculatingId === alloc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50 font-semibold text-xs"
                    >
                      {calculatingId === alloc.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Calculator size={12} />
                      )}
                      Calculate Attainment
                    </button>
                    <ChevronRight size={18} className="text-blue-600 group-hover:translate-x-1 transition-transform cursor-pointer" />
                 </div>
              </div>
            </div>
          </Card>
        )) : (
          <div className="col-span-full p-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
             <BookMarked size={48} className="mx-auto mb-4 text-slate-200" />
             <h3 className="text-lg font-bold text-slate-900">No subjects found</h3>
             <p className="text-slate-500 text-sm">Try changing the academic year or search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
