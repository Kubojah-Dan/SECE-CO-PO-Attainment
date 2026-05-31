import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { Users, Mail, BookOpen, Building2, IdCard, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userService, staffService } from '../../services/api';
import { Loader2 } from 'lucide-react';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';
import { useSelection } from '../../contexts/SelectionContext';
import { useAuth } from '../../contexts/AuthContext';

export default function HODFacultyList() {
  const { selectedAY } = useSelection();
  const { departmentId } = useAuth();
  const [activeTab, setActiveTab] = useState('faculty');

  // ── Faculty query (existing) ────────────────────────────────
  const { data: facultyData, isLoading: isFacultyLoading } = useQuery({
    queryKey: ['hod', 'faculty', selectedAY],
    queryFn: () => userService.getFaculty({ academic_year: selectedAY }),
    select: (res) => res.data
  });

  const faculty = Array.isArray(facultyData)
    ? facultyData
    : (Array.isArray(facultyData?.results) ? facultyData.results : []);

  // ── Staff query (new, HOD-read-only) ──────────────────────
  const { data: staffData, isLoading: isStaffLoading } = useQuery({
    queryKey: ['hod', 'staff', departmentId],
    queryFn: () => staffService.getDeptStaff(departmentId),
    enabled: !!departmentId && activeTab === 'staff',
    select: (res) => {
      const d = res.data;
      return Array.isArray(d) ? d : (Array.isArray(d?.results) ? d.results : []);
    }
  });

  const staff = staffData ?? [];

  const isLoading = activeTab === 'faculty' ? isFacultyLoading : isStaffLoading;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Department People</h1>
          <p className="text-gray-500 font-medium">Faculty and HR Staff in your department</p>
        </div>
        <AcademicYearSelector align="right" />
      </div>

      {/* Tab switcher */}
      <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-xl w-fit">
        {[
          { key: 'faculty', label: 'Faculty' },
          { key: 'staff',   label: 'HR Staff' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="min-h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      )}

      {/* ── Faculty tab ─────────────────────────────────────── */}
      {!isLoading && activeTab === 'faculty' && (
        faculty.length === 0 ? (
          <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
            <Users size={48} className="mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-bold text-slate-900">No faculty members found</h3>
            <p className="text-slate-500 text-sm">Members will appear once they are assigned to your department.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculty.map((f) => (
              <Card key={f.id} className="border border-gray-200 transition-colors hover:border-slate-300">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                    {f.first_name?.[0] || '?'}{f.last_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{f.first_name} {f.last_name}</h3>
                    <p className="text-xs text-gray-500 font-medium">{f.faculty_profile?.designation || 'Faculty Member'}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        <span className="truncate">{f.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded-lg w-fit mt-2">
                        <BookOpen size={14} />
                        <span>{f.faculty_profile?.allocations_count || 0} Assigned Subjects</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Staff tab (read-only) ────────────────────────────── */}
      {!isLoading && activeTab === 'staff' && (
        <>
          {staff.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
              <Users size={48} className="mx-auto mb-4 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-900">No HR Staff assigned</h3>
              <p className="text-slate-500 text-sm">Staff members assigned to your department will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff.map((fp) => (
                <Card key={fp.id} className="border border-gray-200 transition-colors hover:border-slate-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-lg">
                      {fp.user?.first_name?.[0] || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {fp.user?.first_name} {fp.user?.last_name}
                      </h3>
                      <p className="text-xs text-sky-600 font-semibold bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md inline-block mt-0.5">HR Staff</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-1 rounded-lg w-fit">
                          <IdCard size={13} />
                          <span>{fp.employee_id}</span>
                        </div>
                        {fp.hr_department_details?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {fp.hr_department_details.map(d => (
                              <span key={d.id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                <Building2 size={10} />
                                {d.short_name || d.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {/* Read-only notice */}
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 mt-2">
            <Info size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
            <span>To add or remove staff members, contact the admin.</span>
          </div>
        </>
      )}
    </div>
  );
}
