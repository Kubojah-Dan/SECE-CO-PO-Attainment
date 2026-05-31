import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { subjectService, reportService } from '../../services/api';
import Card from '../../components/ui/Card';
import { ArrowLeft, Loader2, FileText, Download, FileSpreadsheet, FileBarChart, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function FacultyReportsPage() {
  const { allocId } = useParams();
  const navigate = useNavigate();

  const { data: subjectData, isLoading } = useQuery({
    queryKey: ['subject-allocation', allocId],
    queryFn: () => subjectService.getAllocationDetail(allocId),
  });

  const handleDownload = async (type, format = 'xlsx') => {
    try {
      toast.info(`Generating ${type} report...`);
      const res = await reportService.generateReport(allocId, type);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_Report_${subjectData?.data?.subject_code}.${format}`);
      document.body.appendChild(link);
      link.click();
      toast.success('Report downloaded successfully');
    } catch (err) {
      toast.error('Failed to generate report');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const reportTypes = [
    { 
      id: 'attainment_matrix', 
      name: 'NBA Attainment Matrix', 
      desc: 'Complete CO-PO mapping and attainment levels for SAR.',
      icon: FileBarChart,
      color: 'blue'
    },
    { 
      id: 'co_summary', 
      name: 'CO Attainment Summary', 
      desc: 'Individual CO performance and target achievement status.',
      icon: FileText,
      color: 'emerald'
    },
    { 
      id: 'marks_report', 
      name: 'Consolidated Mark Sheet', 
      desc: 'Full list of students with marks across all assessments.',
      icon: FileSpreadsheet,
      color: 'indigo'
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Back
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-black text-gray-900 font-display">Course Reports</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{subjectData?.data?.subject_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {reportTypes.map((report) => (
          <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-gray-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                <report.icon size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{report.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{report.desc}</p>
              </div>
            </div>
            
            <button 
              onClick={() => handleDownload(report.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all flex-shrink-0"
            >
              <Download size={15} />
              Download
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 bg-green-50 border border-green-200 border-l-4 border-l-green-600 rounded-xl flex items-start gap-4">
        <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle className="text-green-600" size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">NBA Documentation Ready</h3>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            All reports follow the standard NBA/NAAC formats and can be directly included in your course file.
          </p>
        </div>
      </div>
    </div>
  );
}
