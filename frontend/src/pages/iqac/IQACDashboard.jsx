import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, BarChart3, TrendingUp, Building2, Users, 
  ChevronRight, Download, Filter, Activity, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { toast } from 'react-toastify';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import Card from '../../components/ui/Card';
import { useQuery } from '@tanstack/react-query';
import { analyticsService, reportService } from '../../services/api';
import { Loader2 } from 'lucide-react';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function IQACDashboard() {
  const [selectedAY, setSelectedAY] = useState(1);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['iqac', 'dashboard', selectedAY],
    queryFn: () => analyticsService.iqacDashboard({ academic_year: selectedAY }),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const institutionalData = dashboard?.department_metrics || [];
  
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 font-ui">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-10 text-white shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em] mb-4"
          >
            <ShieldCheck className="w-5 h-5" />
            Quality Assurance Intelligence
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold font-display tracking-tight leading-[1.1]"
          >
            Institutional <br />
            <span className="text-blue-500">Outcome Insights</span>
          </motion.h1>
          <div className="mt-8 flex items-center gap-4">
             <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
             <button 
               onClick={async () => {
                 try {
                   toast.info('Preparing Institutional Report...');
                   const res = await reportService.exportIQAC('excel', selectedAY);
                   const url = window.URL.createObjectURL(new Blob([res.data]));
                   const link = document.createElement('a');
                   link.href = url;
                   link.setAttribute('download', `SAR_Report_${selectedAY}.xlsx`);
                   document.body.appendChild(link);
                   link.click();
                 } catch (err) {
                   toast.error('Failed to generate report');
                 }
               }}
               className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/10"
             >
               <Download size={16} />
               Export SAR Data
             </button>
          </div>
        </div>
        
        <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px]" />
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Readiness', value: `${dashboard?.overall_readiness || 0}%`, target: '/ 100%', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg Attainment', value: `${dashboard?.overall_attainment?.toFixed(1) || 0}%`, target: 'vs 70%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Departments', value: dashboard?.department_count || '11', target: 'Verified', icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Faculty', value: dashboard?.faculty_count || '0', target: 'Participating', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-6 border-none shadow-md bg-white group hover:shadow-2xl transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {stat.label} <span className="text-slate-300 ml-1">{stat.target}</span>
                  </div>
                </div>
                <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-none shadow-2xl bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-display">Department Performance Matrix</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">NBA Criterion 3 Readiness Score</p>
            </div>
          </div>
          
          <div className="h-[400px]">
            {institutionalData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={institutionalData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="dept" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 shadow-2xl rounded-2xl border border-slate-100 min-w-[200px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.dept} Engineering</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-bold text-slate-600">NBA Readiness</span>
                              <span className="text-sm font-bold text-blue-600">{data.score || data.attainment}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={70} 
                    stroke="#ef4444" 
                    strokeDasharray="8 4" 
                    label={{ value: 'TARGET (70%)', fill: '#ef4444', fontSize: 9, fontWeight: 800, position: 'insideTopRight' }} 
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                    {institutionalData.map((entry, index) => (
                      <Cell key={index} fill={(entry.score || entry.attainment) >= 70 ? '#1e40af' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart3 size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-xs uppercase tracking-widest">No comparative data for this year</p>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-8 border-none shadow-2xl bg-white">
            <h3 className="text-xl font-bold text-slate-900 font-display mb-6">IQAC Audit Log</h3>
            <div className="space-y-4">
              {[
                { label: 'CSE SAR Verification', status: 'In Review', icon: Activity, color: 'blue' },
                { label: 'MECH Attainment Audit', status: 'Delayed', icon: AlertTriangle, color: 'amber' },
                { label: 'Annual Quality Report', status: 'Ready', icon: CheckCircle2, color: 'emerald' },
                { label: 'Faculty Feedback Loop', status: 'Open', icon: Users, color: 'purple' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${item.color}-50 text-${item.color}-600 rounded-lg`}><item.icon size={16} /></div>
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </Card>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 rounded-[2rem] text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl"><Activity size={20} /></div>
              <h4 className="text-sm font-bold uppercase tracking-widest">Readiness Warning</h4>
            </div>
            <p className="text-amber-50 font-bold leading-relaxed">
              Based on the selected year, 3 departments have pending attainment calculations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
