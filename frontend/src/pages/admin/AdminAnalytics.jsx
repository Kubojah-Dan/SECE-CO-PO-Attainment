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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-page)' }}>
        <Loader2 className="animate-spin text-[var(--primary-500)]" size={40} />
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Institutional Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Cross-departmental performance &amp; accreditation audit</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector />
          <button className="flex items-center px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--primary-500)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}>
            <Download size={16} className="mr-2" /> Export Report
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10, fontWeight: 600}} interval={0} angle={-30} textAnchor="end" height={60} dy={10} />
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

      <Card className="border-[var(--border)]">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Strategic Insights</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Real-time institutional performance indicators</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--primary-500)' }}>Top Performer</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{insights.top_performer?.dept} Dept</p>
            <p className="text-xs text-[var(--text-muted)]">{insights.top_performer?.score}% documentation readiness</p>
          </div>
          <div className="p-4 rounded-xl space-y-1 bg-amber-50 border border-amber-100">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">Action Required</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{insights.action_required?.dept}</p>
            <p className="text-xs text-[var(--text-muted)]">Attainment below threshold ({insights.action_required?.score}%)</p>
          </div>
          <div className="p-4 rounded-xl space-y-1 bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">Institution Status</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{insights.status?.label}</p>
            <p className="text-xs text-[var(--text-muted)]">{insights.status?.score}% global readiness score</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
