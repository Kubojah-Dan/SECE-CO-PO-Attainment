import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, Download, Calendar, Filter,
  Building2, Users, BookOpen, BookMarked, 
  FileSpreadsheet, Settings, ShieldCheck,
  Trophy, Target, Zap, Loader2, Layout
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

export default function AdminDashboard() {
  const { selectedAY } = useSelection();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin', 'college-overview', selectedAY],
    queryFn: () => analyticsService.adminOverview({ academic_year: selectedAY }),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
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
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institutional Intelligence</h1>
          <div className="flex items-center gap-2 mt-1">
             <AcademicYearSelector />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
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
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200">
          <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                  <ShieldCheck className="text-blue-400" size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Accreditation Readiness</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-5xl font-black text-white">{stats.nba_readiness || 0}<span className="text-2xl text-blue-400">%</span></div>
                  <div className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">NBA READINESS</div>
                </div>
                <div>
                  <div className="text-5xl font-black text-white">{stats.naac_score || 0}<span className="text-2xl text-emerald-400">%</span></div>
                  <div className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">NAAC SCORE</div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>DOCUMENTATION COMPLETENESS</span>
                    <span className="text-white">{stats.doc_completeness || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stats.doc_completeness || 0}%` }} className="h-full bg-blue-500" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>ATTAINMENT ARCHIVING</span>
                    <span className="text-white">{stats.attainment_archiving || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${stats.attainment_archiving || 0}%` }} className="h-full bg-emerald-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between items-end gap-4">
               <div className="p-4 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 text-right w-full md:w-auto">
                 <div className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">Status</div>
                 <div className="text-emerald-400 font-black text-lg flex items-center justify-end gap-2 text-xs">
                   {stats.nba_readiness >= 75 ? 'EXCELLENT' : stats.nba_readiness >= 50 ? 'GOOD' : 'PENDING'} <Zap size={16} fill="currentColor" />
                 </div>
               </div>
               <Link to="/iqac/nba-report">
                 <Button variant="outline" className="bg-white text-slate-900 group">
                   VIEW SAR DRAFT <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </Button>
               </Link>
            </div>
          </div>
          {/* Abstract Decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -ml-32 -mb-32" />
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
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">No PO Mapping Data</div>
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
                      <stop offset="0%" stopColor="#1e4a8a" />
                      <stop offset="100%" stopColor="#3b82f6" />
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
                      <Cell key={`cell-${index}`} fill={entry.attainment >= 70 ? 'url(#barGradient)' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-widest">No departmental data available</div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Access Center */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { label: 'Departments', icon: Building2, path: '/admin/departments', color: 'blue' },
          { label: 'Users', icon: Users, path: '/admin/users', color: 'indigo' },
          { label: 'Regulations', icon: BookOpen, path: '/admin/regulations', color: 'purple' },
          { label: 'Sections', icon: Layout, path: '/admin/sections', color: 'blue' },
          { label: 'Subjects', icon: BookMarked, path: '/admin/subjects', color: 'pink' },
          { label: 'Acad. Years', icon: Calendar, path: '/admin/academic-years', color: 'amber' },
          { label: 'Excel Tools', icon: FileSpreadsheet, path: '/admin/excel-tools', color: 'emerald' },
          { label: 'Settings', icon: Settings, path: '/admin/settings', color: 'slate' },
        ].map((action) => (
          <Link key={action.label} to={action.path} className="group">
            <Card className="p-4 flex flex-col items-center justify-center text-center hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer h-full">
              <div className={`p-3 rounded-2xl bg-${action.color}-50 text-${action.color}-600 group-hover:scale-110 transition-transform mb-3`}>
                <action.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{action.label}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
