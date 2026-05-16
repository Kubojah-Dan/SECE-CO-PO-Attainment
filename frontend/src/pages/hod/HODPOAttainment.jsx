import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { Target, BarChart3, PieChart, Activity, Download, ChevronRight, Layers, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { attainmentService } from '../../services/api';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function HODPOAttainment() {
  const [selectedAY, setSelectedAY] = useState(1);

  const { data: poData, isLoading } = useQuery({
    queryKey: ['hod', 'po-attainment', selectedAY],
    queryFn: () => attainmentService.hodPOAttainment({ academic_year: selectedAY }),
    select: (res) => Array.isArray(res.data) ? res.data : []
  });

  const safeData = Array.isArray(poData) ? poData : [];

  // Transform data for charts
  const radarData = safeData.map(item => ({
    subject: item.po_code,
    attainment: parseFloat(item.attainment_value || 0),
    fullMark: 3
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-display">Program Outcome Attainment</h1>
          <p className="text-sm text-gray-500 font-medium">Departmental PO/PSO achievement metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
          <button className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
            <Download size={16} className="mr-2" /> Download PO Matrix
          </button>
        </div>
      </div>

      {safeData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none shadow-xl bg-white min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-900">PO Attainment Comparison</h3>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Targets Set: 2.5</span>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={radarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 3]} tick={{fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="attainment" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-slate-900 text-white flex flex-col">
              <div className="mb-6">
                <h3 className="font-bold">Institutional Radar</h3>
                <p className="text-xs text-slate-400 mt-1">PO distribution across 12 criteria</p>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Radar
                      name="Attainment"
                      dataKey="attainment"
                      stroke="#60a5fa"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeData.map((po, i) => (
              <Card key={i} className="hover:border-blue-100 transition-all cursor-default">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-xl bg-slate-50 text-slate-900 font-black text-xs`}>
                    {po.po_code}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{parseFloat(po.attainment_value || 0).toFixed(2)}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Level 3.0</p>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug h-10">
                  {po.po_name}
                </h4>
                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map(step => (
                      <div 
                        key={step} 
                        className={`h-1.5 w-8 rounded-full ${step <= Math.round(po.attainment_value) ? 'bg-blue-500' : 'bg-gray-100'}`} 
                      />
                    ))}
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs border-none shadow-md">
          No PO attainment data available for the selected academic year
        </Card>
      )}
    </div>
  );
}
