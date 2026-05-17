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
import { useQuery } from '@tanstack/react-query';
import { allocationService } from '../../services/api';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function SubjectsList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAY, setSelectedAY] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState('All');

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
        <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Search by course code or name..."
            style={{ paddingLeft: '6rem' }}
            className="h-16 w-full rounded-[1.25rem] shadow-sm border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-lg font-medium transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-[1.25rem] shadow-sm px-4">
          <Filter size={18} className="text-slate-400" />
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
            className="group cursor-pointer hover:shadow-2xl hover:border-blue-200 transition-all border-2 border-transparent relative overflow-hidden"
            onClick={() => navigate(`/faculty/subjects/${alloc.id}`)}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${alloc.marks_completion_pct === 100 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  <BookMarked size={24} />
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

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-blue-600 font-bold text-sm">
                   <div className="flex items-center gap-1">
                    <Calculator size={14} /> Calculate Attainment
                   </div>
                   <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
