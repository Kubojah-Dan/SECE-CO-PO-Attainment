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

export default function IQACPOAttainment() {
  const { data: globalData, isLoading } = useQuery({
    queryKey: ['iqac', 'global-attainment'],
    queryFn: () => analyticsService.adminOverview({ academic_year: 1 }),
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
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
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
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 11}} dy={10} />
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
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global Avg</p>
                <h2 className="text-4xl font-black mt-1 font-display">{globalData?.stats?.avg_attainment?.toFixed(1)}%</h2>
              </div>
              <div className="p-2 bg-white/10 rounded-xl">
                <TrendingUp className="text-emerald-400" />
              </div>
            </div>
            <p className="text-slate-400 text-[10px] font-medium mt-4">
              Across {globalData?.stats?.total_departments} departments and {globalData?.stats?.total_subjects} active subjects.
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {deptPerformance.slice(0, 3).map((dept, i) => (
              <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-between hover:border-blue-100 transition-all cursor-default">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Building2 size={16} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{dept.name}</span>
                </div>
                <span className="text-sm font-black text-blue-600">{dept.attainment}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
