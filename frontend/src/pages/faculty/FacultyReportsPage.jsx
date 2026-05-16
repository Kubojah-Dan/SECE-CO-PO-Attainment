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
          <Card key={report.id} className="group hover:shadow-xl transition-all border-none shadow-md">
            <div className="flex items-center justify-between gap-6 p-2">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-2xl bg-${report.color}-50 text-${report.color}-600 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <report.icon size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{report.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{report.desc}</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleDownload(report.id)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-slate-200"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-10 text-center bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle className="text-emerald-500" size={32} />
        </div>
        <h3 className="text-xl font-bold text-emerald-900">NBA Documentation Ready</h3>
        <p className="text-sm text-emerald-700 mt-2 max-w-md mx-auto leading-relaxed">
          All reports follow the standard NBA/NAAC formats. You can directly include these in your course file.
        </p>
      </div>
    </div>
  );
}
