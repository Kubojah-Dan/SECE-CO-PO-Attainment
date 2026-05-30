import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, Download,
  ShieldCheck, Trophy, Target, Loader2,
  Network, Users2, Scale, Layers, BookOpenCheck,
  CalendarDays, DatabaseZap, Settings2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/api';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';
import { useSelection } from '../../contexts/SelectionContext';
import { reportService } from '../../services/api';
import { toast } from 'react-toastify';
import { DESIGN_TOKENS } from '../../constants';

export default function AdminDashboard() {
  const { selectedAY } = useSelection();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin', 'college-overview', selectedAY],
    queryFn: () => analyticsService.adminOverview({ academic_year: selectedAY }),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-page)' }}>
        <Loader2 className="animate-spin text-[var(--primary-500)]" size={40} />
      </div>
    );
  }

  const stats = overview?.stats || {};
  const deptPerformance = overview?.dept_performance || [];
  const poRadar = overview?.po_radar || {};
  
  // Transform poRadar object to array for Recharts
  const radarData = Object.entries(poRadar).map(([po, val]) => ({
    subject: po,
    attainment: val,
    fullMark: 100
  })).sort((a, b) => a.subject.localeCompare(b.subject, undefined, { numeric: true }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Institution Overview</h1>
          <div className="flex items-center gap-2 mt-1">
             <AcademicYearSelector />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="dark" 
            icon={Download} 
            className="text-sm px-4 py-2 rounded-xl"
            onClick={async () => {
              const toastId = toast.loading('Generating master institutional report...');
              try {
                const response = await reportService.exportMasterReport();
                // If it returns 202 (Accepted) as planned
                if (response.status === 202) {
                  toast.update(toastId, { render: response.data.message, type: 'info', isLoading: false, autoClose: 5000 });
                } else {
                  // Fallback for direct download if implemented
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `SECE_Master_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
                  document.body.appendChild(link);
                  link.click();
                  toast.update(toastId, { render: 'Report downloaded', type: 'success', isLoading: false, autoClose: 3000 });
                }
              } catch (err) {
                toast.update(toastId, { render: 'Failed to generate report', type: 'error', isLoading: false, autoClose: 3000 });
              }
            }}
          >
            Export Master Report
          </Button>
        </div>
      </div>

      {/* Executive Score Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* NBA Readiness Score Card */}
        {/* Accreditation Readiness — tinted enterprise card */}
        <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-7">
          <div className="flex flex-col md:flex-row justify-between gap-8">

            {/* Left: metrics */}
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                  <ShieldCheck className="text-slate-600" size={20} strokeWidth={1.75} />
                </div>
                <h2 className="text-base font-semibold text-slate-800">Accreditation Readiness</h2>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-4xl font-bold text-slate-900">
                    {stats.nba_readiness || 0}<span className="text-xl text-slate-400 font-semibold">%</span>
                  </div>
                  <div className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">NBA Readiness</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-900">
                    {stats.naac_score || 0}<span className="text-xl text-slate-400 font-semibold">%</span>
                  </div>
                  <div className="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest">NAAC Score</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Documentation Completeness</span>
                    <span className="text-slate-700">{stats.doc_completeness || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stats.doc_completeness || 0}%` }} className="h-full bg-slate-700 rounded-full" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span>Attainment Archiving</span>
                    <span className="text-slate-700">{stats.attainment_archiving || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stats.attainment_archiving || 0}%` }} className="h-full bg-slate-700 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: status + CTA */}
            <div className="flex flex-col justify-between items-start md:items-end gap-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-right w-full md:w-auto min-w-[140px]">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">Status</div>
                <div className="flex items-center justify-end gap-2">
                  {/* Semantic status dot — no icon flash */}
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    stats.nba_readiness >= 75 ? 'bg-emerald-500' :
                    stats.nba_readiness >= 50 ? 'bg-blue-500' :
                    'bg-amber-400'
                  }`} />
                  <span className="text-slate-800 font-bold text-sm tracking-wide">
                    {stats.nba_readiness >= 75 ? 'Excellent' : stats.nba_readiness >= 50 ? 'Good' : 'Pending'}
                  </span>
                </div>
              </div>
              <Link to="/iqac/nba-report">
                <Button variant="secondary" className="group text-sm">
                  View SAR Draft <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Global Stats Mini Card */}
        <div className="space-y-6">
          <StatCard 
            title="Institutional PO Average" 
            value={stats.avg_attainment?.toFixed(1) || '0.0'} 
            icon={Target} 
            color="blue" 
            premium
          />
          <StatCard 
            title="Faculty Participation" 
            value={`${stats.faculty_participation || 0}%`} 
            icon={Trophy} 
            color="green" 
            premium
          />
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Radar Comparison */}
        <Card title="Program Outcome Distribution" subtitle="Overall institutional PO attainment levels">
          <div className="h-[350px] w-full mt-4">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Attainment"
                    dataKey="attainment"
                  stroke={DESIGN_TOKENS.INFO}
                    fill={DESIGN_TOKENS.INFO}
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              /* Empty state: faint axis grid communicates the chart container */
              <div className="h-full w-full flex flex-col items-center justify-center gap-3"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
                  backgroundSize: '16.66% 20%',
                }}
              >
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200" />
                <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">No PO Mapping Data</p>
              </div>
            )}
          </div>
        </Card>

        {/* Department Attainment Heatmap Style Bar Chart */}
        <Card className="lg:col-span-2" title="Department Performance Index" subtitle="Attainment levels across all institutional departments">
          <div className="h-[350px] w-full mt-4">
            {deptPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptPerformance} margin={{ bottom: 30 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={DESIGN_TOKENS.PRIMARY} />
                      <stop offset="100%" stopColor={DESIGN_TOKENS.INFO} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} 
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="attainment" radius={[8, 8, 0, 0]} barSize={32}>
                    {deptPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.attainment >= 70 ? 'url(#barGradient)' : DESIGN_TOKENS.DANGER} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-3"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent calc(20% - 1px), #f1f5f9 calc(20% - 1px), #f1f5f9 20%)',
                }}
              >
                <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">No Departmental Data Available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Access Center */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Departments', icon: Network,       path: '/admin/departments',   color: 'blue'   },
          { label: 'Users',       icon: Users2,        path: '/admin/users',         color: 'indigo' },
          { label: 'Regulations', icon: Scale,         path: '/admin/regulations',   color: 'purple' },
          { label: 'Sections',    icon: Layers,        path: '/admin/sections',      color: 'blue'   },
          { label: 'Subjects',    icon: BookOpenCheck, path: '/admin/subjects',      color: 'pink'   },
          { label: 'Acad. Years', icon: CalendarDays,  path: '/admin/academic-years',color: 'amber'  },
          { label: 'Excel Tools', icon: DatabaseZap,   path: '/admin/excel-tools',   color: 'emerald'},
          { label: 'Settings',    icon: Settings2,     path: '/admin/settings',      color: 'slate'  },
        ].map((action) => (
          <Link key={action.label} to={action.path} className="group">
            {/* Monochromatic slate accent — no varied pastels */}
            <div className="card-enter bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 cursor-pointer py-6 px-4">
              <div className="p-3 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-200 group-hover:scale-105 transition-all duration-200 mb-3">
                <action.icon size={20} strokeWidth={1.75} />
              </div>
              <span className="text-xs font-semibold text-slate-600 tracking-wide">{action.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
