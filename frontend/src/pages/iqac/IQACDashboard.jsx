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
import { useSelection } from '../../contexts/SelectionContext';
import { analyticsService, reportService } from '../../services/api';
import { Loader2 } from 'lucide-react';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';
import { DESIGN_TOKENS } from '../../constants';

export default function IQACDashboard() {
  const { selectedAY, setSelectedAY } = useSelection();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['iqac', 'dashboard', selectedAY],
    queryFn: () => analyticsService.iqacDashboard({ academic_year: selectedAY }),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-page)' }}>
        <Loader2 className="animate-spin text-[var(--primary-500)]" size={40} />
      </div>
    );
  }

  const institutionalData = dashboard?.department_metrics || [];
  
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header — light enterprise banner, no overflow-hidden so dropdown floats freely */}
      <div className="relative rounded-2xl p-8 bg-slate-50 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold uppercase tracking-[0.3em] mb-2">
              <ShieldCheck size={13} className="text-slate-400" />
              Overview
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
              Institutional Outcome Insights
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} align="left" />
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
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Download size={14} />
              Export SAR Data
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Readiness', value: `${dashboard?.overall_readiness || 0}%`, target: '/ 100%', icon: ShieldCheck },
          { label: 'Avg Attainment',    value: `${dashboard?.overall_attainment?.toFixed(1) || 0}%`, target: 'vs 70%', icon: TrendingUp },
          { label: 'Departments',       value: dashboard?.department_count || '11', target: 'Verified', icon: Building2 },
          { label: 'Active Faculty',    value: dashboard?.faculty_count || '0', target: 'Participating', icon: Users },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="p-5 border border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {stat.label} <span className="text-slate-300 ml-1">{stat.target}</span>
                  </div>
                </div>
                {/* Monochromatic slate icon — no varied pastels */}
                <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
                  <stat.icon size={18} strokeWidth={1.75} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border border-gray-200 bg-white">
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
                      <Cell key={index} fill={(entry.score || entry.attainment) >= 70 ? DESIGN_TOKENS.PRIMARY : DESIGN_TOKENS.TEXT_MUTED} />
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
          <Card className="p-8 border border-gray-200 bg-white">
            <h3 className="text-xl font-bold text-slate-900 font-display mb-6">IQAC Audit Log</h3>
            <div className="space-y-4">
              {(dashboard?.recent_atrs || []).map((item, idx) => {
                const IconComponent = {
                  Activity, AlertTriangle, CheckCircle2, Users
                }[item.icon] || Activity;
                
                return (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 group hover:border-slate-300 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    {/* Monochromatic icon — no dynamic pastel colors */}
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg flex-shrink-0"><IconComponent size={15} strokeWidth={1.75} /></div>
                    <span className="text-xs font-semibold text-slate-700">{item.label} <span className="text-slate-400 font-normal">— {item.status}</span></span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              )})}
            </div>
          </Card>

          <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Activity size={16} className="text-amber-700" strokeWidth={1.75} /></div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest">Readiness Warning</h4>
            </div>
            <p className="text-amber-700 text-sm font-medium leading-relaxed">
              Based on the selected year, {institutionalData.filter(d => (d.attainment || 0) === 0).length} departments have pending attainment calculations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
