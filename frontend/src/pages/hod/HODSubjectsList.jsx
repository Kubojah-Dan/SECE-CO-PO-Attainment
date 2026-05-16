import React from 'react';
import Card from '../../components/ui/Card';
import { BookMarked, User, Layout, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { allocationService } from '../../services/api';
import { Loader2 } from 'lucide-react';

export default function HODSubjectsList() {
  const { data: allocations, isLoading } = useQuery({
    queryKey: ['hod', 'allocations'],
    queryFn: () => allocationService.getAllocations({ department_only: true }),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Department Subjects</h1>
        <p className="text-gray-500">Monitor all subject allocations and their attainment status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allocations?.map((alloc) => (
          <Card key={alloc.id} className="group hover:border-blue-200 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <BookMarked size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{alloc.subject_name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-tighter">
                      {alloc.subject_code}
                    </span>
                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Layout size={12} /> Section {alloc.section_name}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(alloc.approval_status)}
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  <User size={14} className="text-gray-400" />
                  <span className="font-bold">{alloc.faculty_name}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">COs</p>
                  <p className="text-sm font-bold text-gray-700">{alloc.co_count || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Attainment</p>
                  <p className={`text-sm font-bold ${alloc.attainment_level >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
                    {alloc.attainment_level ? `Level ${alloc.attainment_level}` : 'N/A'}
                  </p>
                </div>
              </div>
              
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-2 decoration-blue-100">
                View Details
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
