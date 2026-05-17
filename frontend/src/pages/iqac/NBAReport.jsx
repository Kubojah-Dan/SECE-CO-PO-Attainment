import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import { Award, CheckCircle, AlertCircle, Download, FileText, BarChart3, Clock, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService, reportService } from '../../services/api';
import AcademicYearSelector from '../../components/ui/AcademicYearSelector';

export default function NBAReport() {
  const [selectedAY, setSelectedAY] = useState(1);

  const { data: readinessData, isLoading } = useQuery({
    queryKey: ['iqac', 'nba-readiness', selectedAY],
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

  const sections = [
    { 
      id: 'c3_1', 
      title: '3.1 Correlation between courses and POs/PSOs', 
      score: readinessData?.criterion_scores?.c3_1 || 0, 
      max: 20,
      status: (readinessData?.criterion_scores?.c3_1 || 0) >= 20 ? 'Complete' : 'In Progress',
      description: 'Course Outcomes (COs) defined and mapped to POs/PSOs.'
    },
    { 
      id: 'c3_2', 
      title: '3.2 Attainment of Course Outcomes', 
      score: readinessData?.criterion_scores?.c3_2 || 0, 
      max: 50,
      status: (readinessData?.criterion_scores?.c3_2 || 0) >= 40 ? 'Complete' : 'In Progress',
      description: 'CO attainment based on direct/indirect assessments.'
    },
    { 
      id: 'c3_3', 
      title: '3.3 Attainment of Program Outcomes', 
      score: readinessData?.criterion_scores?.c3_3 || 0, 
      max: 50,
      status: (readinessData?.criterion_scores?.c3_3 || 0) >= 30 ? 'Complete' : 'Pending',
      description: 'Aggregated attainment levels for all 12 POs.'
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-display">NBA Criterion 3 - SAR Analysis</h1>
          <div className="mt-2 flex items-center gap-2">
            <AcademicYearSelector selectedId={selectedAY} onChange={setSelectedAY} />
          </div>
        </div>
        <button 
          onClick={async () => {
             const res = await reportService.exportIQAC('pdf', selectedAY);
             const url = window.URL.createObjectURL(new Blob([res.data]));
             const link = document.createElement('a');
             link.href = url;
             link.setAttribute('download', `NBA_SAR_Draft_${selectedAY}.pdf`);
             document.body.appendChild(link);
             link.click();
          }}
          className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-xl shadow-slate-200 hover:bg-black transition-all"
        >
          <Download className="w-4 h-4 mr-2" />
          Generate SAR Draft
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-600 text-white border-none shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Institutional Readiness</p>
              <h2 className="text-5xl font-black mt-2">{readinessData?.overall_readiness || 0}%</h2>
              <p className="text-blue-100 text-xs mt-4">Based on current cycle data uploads.</p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl">
              <Award size={32} />
            </div>
          </div>
        </Card>

        <Card className="flex flex-col justify-center border-none shadow-xl bg-slate-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mapping Completeness</span>
              <span className="text-sm font-bold text-slate-700">{readinessData?.mapping_pct || 0}%</span>
            </div>
            <div className="progress-bar bg-white h-2">
              <div className="progress-fill bg-emerald-500" style={{width: `${readinessData?.mapping_pct || 0}%`}} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Attainment Processed</span>
              <span className="text-sm font-bold text-slate-700">{readinessData?.attainment_pct || 0}%</span>
            </div>
            <div className="progress-bar bg-white h-2">
              <div className="progress-fill bg-blue-500" style={{width: `${readinessData?.attainment_pct || 0}%`}} />
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id} className="hover:border-blue-100 transition-all cursor-default">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                    section.status === 'Complete' ? 'bg-emerald-50 text-emerald-600' :
                    section.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {section.status}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 leading-snug">{section.title}</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{section.description}</p>
              </div>
              
              <div className="text-right flex flex-col items-end">
                <div className="text-2xl font-black text-slate-900">
                  {section.score} <span className="text-slate-300 text-sm">/ {section.max}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Weighted Score</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
