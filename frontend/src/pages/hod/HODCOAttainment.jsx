import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { Calculator, Filter, Download, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { attainmentService } from '../../services/api';
import AttainmentBadge from '../../components/ui/AttainmentBadge';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function HODCOAttainment() {
  const [selectedAY, setSelectedAY] = useState(1);

  const { data: rawResponse, isLoading } = useQuery({
    queryKey: ['hod', 'co-attainment', selectedAY],
    queryFn: () => attainmentService.hodCOAttainment({ academic_year: selectedAY }),
  });

  // CRITICAL: Handle paginated or error responses safely
  const coData = rawResponse?.data;
  const safeData = Array.isArray(coData) 
    ? coData 
    : (Array.isArray(coData?.results) ? coData.results : []);
  
  const avgAttainment = safeData.length > 0 
    ? (safeData.reduce((s, c) => s + parseFloat(c.final_attainment || 0), 0) / safeData.length).toFixed(1)
    : '0.0';

  const targetsMet = safeData.filter(c => c.target_achieved).length;
  const targetsBelow = safeData.filter(c => !c.target_achieved).length;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-display">Department CO Attainment</h1>
          <p className="text-sm text-gray-500 font-medium">Consolidated Course Outcome performance for all subjects</p>
        </div>
        <div className="flex items-center gap-3">
          <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
          <button className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all">
            <Download size={14} className="mr-2" /> Export Summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total COs Tracked', value: safeData.length, icon: Calculator, color: 'blue' },
          { label: 'Avg Attainment', value: `${avgAttainment}%`, icon: TrendingUp, color: 'indigo' },
          { label: 'Targets Met', value: targetsMet, icon: CheckCircle, color: 'emerald' },
          { label: 'Below Target', value: targetsBelow, icon: AlertCircle, color: 'amber' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 border-none shadow-md">
            <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg w-fit mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest">Subject</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest">CO Code</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-center">Attainment (%)</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-center">Level</th>
                <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {safeData.length > 0 ? safeData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <span className="font-bold text-slate-900 text-sm">{item.subject_code}</span>
                    <p className="text-[10px] text-gray-500 font-medium truncate max-w-[200px]">{item.subject_name}</p>
                  </td>
                  <td className="p-4 font-mono text-xs font-bold text-blue-600">{item.co_code}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-black text-slate-700">{parseFloat(item.final_attainment || 0).toFixed(1)}%</span>
                      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: `${item.final_attainment}%`}} />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <AttainmentBadge level={item.attainment_level} />
                  </td>
                  <td className="p-4 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      item.target_achieved 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.target_achieved ? 'Met' : 'Below'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                    No CO attainment data available for the selected academic year
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
