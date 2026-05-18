import React from 'react';
import { 
  TrendingUp, Download, Loader2 
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';
import { useSelection } from '../../contexts/SelectionContext';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../../services/api';

export default function AdminAnalytics() {
  const { selectedAY } = useSelection();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin', 'college-overview', selectedAY],
    queryFn: () => analyticsService.adminOverview({ academic_year: selectedAY }),
    select: (res) => res.data
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const deptData = overview?.dept_performance || [];
  const trendData = overview?.trend_data || [];
  const insights = overview?.insights || {
    top_performer: { dept: 'Pending', score: 0 },
    action_required: { dept: 'Pending', score: 0 },
    status: { label: 'PENDING DATA', score: 0 }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Institutional Analytics</h1>
          <p className="text-gray-500 font-medium mt-2">Cross-departmental performance & accreditation audit</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector />
          <button className="flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25">
            <Download size={18} className="mr-2" /> Export Audit Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Comparison */}
        <Card title="Department Performance Index" subtitle="Avg. PO Attainment vs Documentation Readiness">
          <div className="h-[350px] w-full mt-6">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Legend />
                  <Bar dataKey="attainment" name="Avg Attainment (%)" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="documentation" name="NBA Readiness (%)" fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-xs uppercase tracking-widest">No department data found</p>
              </div>
            )}
          </div>
        </Card>

        {/* Institutional Trend */}
        <Card title="Institutional Growth Trend" subtitle="Year-over-year attainment percentage improvement">
          <div className="h-[350px] w-full mt-6">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg" 
                    name="Avg Attainment"
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={48} className="mb-4 opacity-20" />
                <p className="font-bold text-xs uppercase tracking-widest">No historical trends found</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title="Strategic Insights" className="bg-slate-900 text-white border-none shadow-2xl rounded-[2rem] p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
          <div className="space-y-2">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Top Performer</p>
            <p className="text-2xl font-bold">{insights.top_performer?.dept} Department</p>
            <p className="text-sm text-slate-400">{insights.top_performer?.score}% documentation readiness achieved.</p>
          </div>
          <div className="space-y-2 border-x border-white/10 px-8">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Action Required</p>
            <p className="text-2xl font-bold">{insights.action_required?.dept}</p>
            <p className="text-sm text-slate-400">Target attainment below threshold ({insights.action_required?.score}%). Review PO mapping.</p>
          </div>
          <div className="space-y-2">
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Institution Status</p>
            <p className="text-2xl font-bold font-display tracking-tight text-white">{insights.status?.label}</p>
            <p className="text-sm text-slate-400">{insights.status?.score}% global documentation readiness score.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
