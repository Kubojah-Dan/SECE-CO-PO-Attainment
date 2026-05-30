import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, Users, Award, TrendingUp, 
  Download, Loader2, CheckCircle, XCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  Radar, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { analyticsService, allocationService, reportService } from '../../services/api';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';
import { useSelection } from '../../contexts/SelectionContext';
import { DESIGN_TOKENS } from '../../constants';

export default function HODDashboard() {
  const { user } = useAuth();
  const deptName = user?.department_name || 'Department';
  const deptId = user?.department_id;
  const { selectedAY } = useSelection();

  const { data: rawDashboard, isLoading: isDashLoading } = useQuery({
    queryKey: ['hod', 'dashboard', deptId, selectedAY],
    queryFn: () => analyticsService.hodDashboard({ department: deptId, academic_year: selectedAY }),
    enabled: !!deptId,
  });

  const { data: rawAttainment, isLoading: isAttainmentLoading } = useQuery({
    queryKey: ['hod', 'attainment', deptId, selectedAY],
    queryFn: () => analyticsService.hodAttainmentSummary({ department: deptId, academic_year: selectedAY }),
    enabled: !!deptId,
  });

  if (isDashLoading || isAttainmentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-page)' }}>
        <Loader2 className="animate-spin text-[var(--primary-500)]" size={40} />
      </div>
    );
  }

  const dashboardData = rawDashboard?.data || {};
  const attainmentData = rawAttainment?.data || {};
  const readiness = dashboardData.readiness || {};
  const poAverages = attainmentData.po_averages || {};
  const facultyProgress = dashboardData.faculty_progress || [];
  
  const poChartData = Object.entries(poAverages).map(([po, val]) => ({
    subject: po,
    attainment: val,
    fullMark: 100
  })).sort((a, b) => a.subject.localeCompare(b.subject, undefined, { numeric: true }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">{deptName}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Real-time academic performance and accreditation status</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector />
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors">
            <Download className="w-4 h-4" />
            Export Summary
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Subjects" value={readiness.active_subjects || 0} icon={BookOpen} color="blue" />
        <StatCard title="NBA Readiness" value={`${readiness.documentation_completeness || 0}%`} icon={Users} color="amber" />
        <StatCard title="Avg. PO Attainment" value={`${readiness.overall_attainment?.toFixed(1) || 0}%`} icon={Award} color="green" />
        <StatCard title="Faculty Participation" value={`${readiness.faculty_participation || 0}%`} icon={TrendingUp} color="blue" />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* PO Analysis */}
        <Card title="PO Attainment Analysis" subtitle="Mapping of 12 Program Outcomes vs Target Level">
          <div className="h-[450px] w-full mt-4">
            {poChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={poChartData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{fill: '#6b7280', fontSize: 12, fontWeight: 700}} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Attainment"
                    dataKey="attainment"
                    stroke={DESIGN_TOKENS.PRIMARY}
                    fill={DESIGN_TOKENS.PRIMARY}
                    fillOpacity={0.6}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                No PO data calculated for this academic year
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Progress Table */}
      <Card title="Faculty Progress" subtitle="Mark entry and attainment calculation status">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Faculty Name</th>
                <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">NBA Matrix</th>
                <th className="py-4 px-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {facultyProgress.length > 0 ? facultyProgress.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-4 px-2">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs mr-3">
                        {row.faculty_name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900">{row.faculty_name}</span>
                        <div className="text-[10px] text-gray-400 font-medium">Sec {row.section_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <Link 
                      to={`/hod/co-attainment?subject_allocation=${row.id}`}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {row.subject_name}
                    </Link>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{width: `${row.progress}%`}} />
                      </div>
                      <span className={`text-[10px] font-bold ${row.attainment_status === 'Calculated' ? 'text-green-600' : 'text-amber-600'}`}>
                        {row.attainment_status}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <button 
                      onClick={async () => {
                        const res = await reportService.generateReport(row.id, 'attainment_matrix');
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `NBA_Report_${row.subject_name}.xlsx`);
                        document.body.appendChild(link);
                        link.click();
                      }}
                      className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      NBA Matrix
                    </button>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.approval_status === 'PENDING' ? (
                        <>
                          <button 
                            onClick={async () => {
                              await allocationService.approve(row.id, { status: 'APPROVED', remarks: 'HOD Verified' });
                              toast.success('Approved');
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all" 
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            onClick={async () => {
                              const remarks = prompt('Enter rejection remarks:');
                              if (remarks) {
                                await allocationService.approve(row.id, { status: 'REJECTED', remarks });
                                toast.error('Allocation Rejected');
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          row.approval_status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {row.approval_status}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    No faculty progress data for the selected academic year
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
