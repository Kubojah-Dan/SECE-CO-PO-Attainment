import React from 'react';
import Card from '../../components/ui/Card';
import { BarChart3, TrendingUp, Download, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/api';
import { Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { useSelection } from '../../contexts/SelectionContext';

export default function IQACPOAttainment() {
  const { selectedAY } = useSelection();

  const { data: globalData, isLoading } = useQuery({
    queryKey: ['iqac', 'global-attainment', selectedAY],
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

  const deptPerformance = globalData?.dept_performance || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Institutional Attainment</h1>
          <p className="text-gray-500">Cross-departmental performance analysis and NBA readiness</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Download SAR Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Department Comparison Chart */}
        <Card className="lg:col-span-2" title="Departmental Performance Index" subtitle="Average PO attainment percentage per department">
          <div className="h-80 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptPerformance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} interval={0} angle={-30} textAnchor="end" height={60} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-xl)'}}
                />
                <Bar dataKey="attainment" radius={[6, 6, 0, 0]} barSize={40}>
                  {deptPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.attainment > 75 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Quick Insights */}
        <div className="space-y-6">
          {/* Global Avg — light enterprise card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Global Avg</p>
                <h2 className="text-4xl font-bold text-slate-900 mt-1 font-display">{globalData?.stats?.avg_attainment?.toFixed(1)}%</h2>
              </div>
              <div className="p-2.5 bg-slate-200 rounded-xl">
                <TrendingUp className="text-slate-700" size={18} strokeWidth={1.75} />
              </div>
            </div>
            <p className="text-slate-500 text-[11px] mt-4">
              Across {globalData?.stats?.total_departments} departments and {globalData?.stats?.total_subjects} active subjects.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {deptPerformance.slice(0, 3).map((dept, i) => (
              <div key={i} className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors cursor-default">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                    <Building2 size={14} strokeWidth={1.75} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{dept.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-700">{dept.attainment}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
