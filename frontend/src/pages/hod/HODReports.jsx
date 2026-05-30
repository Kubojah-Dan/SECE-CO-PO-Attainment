import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelection } from '../../contexts/SelectionContext';
import { 
  FileText, Download, Filter, Search, 
  BarChart3, PieChart, TrendingUp, Users,
  Building2, Loader2
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { motion } from 'framer-motion';
import { departmentService, reportService } from '../../services/api';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function HODReports() {
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedAY, setSelectedAY } = useSelection();

  const { data: deptInfo, isLoading: deptLoading } = useQuery({
    queryKey: ['hod-department'],
    queryFn: () => departmentService.getMyDepartment().then(r => r.data),
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['hod-reports', selectedAY],
    queryFn: () => reportService.getDepartmentReports(selectedAY).then(r => r.data),
    select: (res) => Array.isArray(res.data) ? res.data : []
  });

  const safeReports = Array.isArray(reports) ? reports : [];

  const avgAttainment = safeReports.length > 0 
    ? (safeReports.reduce((s, r) => s + parseFloat(r.attainment_score || 0), 0) / safeReports.length).toFixed(1)
    : '0.0';

  const stats = [
    { label: 'Courses Analyzed',    value: safeReports.length,        icon: FileText  },
    { label: 'Avg Dept Attainment', value: `${avgAttainment}%`,        icon: TrendingUp },
    { label: 'Active Faculty',      value: deptInfo?.faculty_count || 0, icon: Users    },
  ];

  if (deptLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Generating Department Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 font-ui">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">
            <Building2 size={14} /> {deptInfo?.name || 'Department'} Intelligence
          </div>
          <h1 className="text-4xl font-bold text-slate-900 font-display tracking-tight">Accreditation Reports</h1>
          <p className="text-slate-500 font-medium mt-1">Institutional performance analytics and NBA/NAAC reporting</p>
        </div>
        
        <div className="flex items-center gap-3">
          <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors">
            <Download size={18} />
            Bulk Export All
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-5 border border-gray-200 bg-white cursor-default">
              <div className="flex items-center gap-4">
                {/* Monochromatic slate icon — no varied pastels */}
                <div className="p-3 bg-slate-100 text-slate-600 rounded-xl flex-shrink-0">
                  <stat.icon size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Reports Table Card */}
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md overflow-hidden p-0">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search course code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Course Details</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Primary Instructor</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Attainment Status</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Last Updated</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportsLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-10"><div className="h-12 bg-slate-50 rounded-2xl w-full" /></td>
                  </tr>
                ))
              ) : safeReports.length > 0 ? (
                safeReports.filter(r => r.course_name.toLowerCase().includes(searchTerm.toLowerCase())).map((report) => (
                  <tr key={report.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{report.course_name}</span>
                        <span className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{report.course_code}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                          {report.instructor_name?.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{report.instructor_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                          <div 
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${report.attainment_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-600">{report.attainment_score}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">{report.updated_at || 'Never'}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                        <Download size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="p-20 text-center">
                    <div className="p-6 bg-slate-50 rounded-full text-slate-200 w-fit mx-auto mb-4">
                      <PieChart size={60} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No Reports Available</h3>
                    <p className="text-slate-500 max-w-sm mx-auto text-sm">
                      Select a different academic year or wait for attainment calculations to complete.
                    </p>
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
