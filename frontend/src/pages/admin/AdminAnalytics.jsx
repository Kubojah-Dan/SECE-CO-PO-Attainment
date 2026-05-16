import React, { useState } from 'react';
import { 
  TrendingUp, Users, Building2, BookOpen, 
  Download, Filter, Calendar, BarChart3 
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

const MOCK_DEPT_DATA = [
  { name: 'CSE', attainment: 82, documentation: 95 },
  { name: 'ECE', attainment: 78, documentation: 88 },
  { name: 'MECH', attainment: 65, documentation: 72 },
  { name: 'CIVIL', attainment: 70, documentation: 80 },
  { name: 'IT', attainment: 85, documentation: 98 },
];

const MOCK_TREND_DATA = [
  { year: '2020-21', avg: 68 },
  { year: '2021-22', avg: 72 },
  { year: '2022-23', avg: 75 },
  { year: '2023-24', avg: 81 },
];

import { useSelection } from '../../contexts/SelectionContext';

export default function AdminAnalytics() {
  const { selectedAY } = useSelection();

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Institutional Analytics</h1>
          <p className="text-gray-500 font-medium mt-2">Cross-departmental performance & accreditation audit</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector />
          <button className="btn-primary flex items-center px-6 py-2.5 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all">
            <Download size={18} className="mr-2" /> Export Audit Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Department Comparison */}
        <Card title="Department Performance Index" subtitle="Avg. PO Attainment vs Documentation Readiness">
          <div className="h-[350px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_DEPT_DATA}>
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
          </div>
        </Card>

        {/* Institutional Trend */}
        <Card title="Institutional Growth Trend" subtitle="Year-over-year attainment percentage improvement">
          <div className="h-[350px] w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Line 
                  type="monotone" 
                  dataKey="avg" 
                  stroke="#8b5cf6" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Strategic Insights" className="bg-slate-900 text-white border-none shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
          <div className="space-y-2">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Top Performer</p>
            <p className="text-2xl font-bold">IT Department</p>
            <p className="text-sm text-slate-400">98% documentation completeness achieved this cycle.</p>
          </div>
          <div className="space-y-2 border-x border-white/10 px-8">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Action Required</p>
            <p className="text-2xl font-bold">Mechanical</p>
            <p className="text-sm text-slate-400">Target attainment below threshold (65%). Review PO mapping.</p>
          </div>
          <div className="space-y-2">
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Institution Status</p>
            <p className="text-2xl font-bold font-display tracking-tight text-white">NBA TIER-1 READY</p>
            <p className="text-sm text-slate-400">84% global documentation readiness score.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
