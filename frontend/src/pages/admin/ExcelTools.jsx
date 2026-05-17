/**
 * SECE CO-PO Platform — Automated Excel Template Generator
 */
import React, { useState } from 'react';
import { 
  FileSpreadsheet, Download, CheckCircle2, 
  ChevronLeft, Info, AlertCircle, Loader2,
  Table, ListChecks, Settings2, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { reportService } from '../../services/api';
import { toast } from 'react-toastify';

export default function ExcelTools() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('marks');

  const handleGenerate = async () => {
    setIsGenerating(true);
    const toastId = toast.loading(`Preparing ${selectedType} template...`);
    try {
      const response = await reportService.getTemplate(selectedType);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.update(toastId, { 
        render: `${selectedType.toUpperCase()} template downloaded successfully`, 
        type: 'success', 
        isLoading: false, 
        autoClose: 3000 
      });
    } catch (error) {
      toast.update(toastId, { 
        render: 'Failed to generate template. Please check network connection.', 
        type: 'error', 
        isLoading: false, 
        autoClose: 3000 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-10 font-ui">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)}
              className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-lg transition-all text-slate-400 hover:text-blue-600 group"
            >
              <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 font-display tracking-tight leading-none">Excel Automation</h1>
              <p className="text-slate-500 font-medium mt-3 text-lg">Smart template generation for high-speed institutional data entry</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-full font-bold text-xs uppercase tracking-widest border border-blue-100">
            <Activity size={16} /> Live Sync Active
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Generator Controls */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="p-10 border-none shadow-2xl bg-white rounded-[2.5rem]">
              <h3 className="text-xl font-bold text-slate-900 font-display mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Settings2 size={24} /></div>
                Configuration
              </h3>
              
              <div className="space-y-8">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-5 ml-1">Template Type</label>
                  <div className="grid gap-4">
                    {[
                      { id: 'marks', label: 'Marks Entry Grid', icon: Table, desc: 'For CIA and ESE marks' },
                      { id: 'students', label: 'Student Batch Import', icon: Users, desc: 'Bulk enrollment sheets' },
                      { id: 'subjects', label: 'Course Catalog', icon: FileSpreadsheet, desc: 'Master subject definitions' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`flex items-center gap-5 p-5 rounded-[1.5rem] border-2 transition-all group ${
                          selectedType === type.id 
                            ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-lg shadow-blue-600/5' 
                            : 'border-slate-50 bg-slate-50/50 text-slate-500 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`p-3 rounded-xl transition-colors ${selectedType === type.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 group-hover:text-blue-500'}`}>
                          <type.icon size={20} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold">{type.label}</div>
                          <div className="text-[10px] font-medium opacity-60 mt-0.5">{type.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-bold text-sm hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-4 group"
                  >
                    {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} className="group-hover:translate-y-0.5 transition-transform" />}
                    {isGenerating ? 'Generating Template...' : 'Download Master Template'}
                  </button>
                </div>
              </div>
            </Card>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-3 text-blue-400 mb-4">
                  <Info size={24} />
                  <h4 className="font-bold text-sm uppercase tracking-widest">Automation Tip</h4>
                </div>
                <p className="text-slate-400 font-medium leading-relaxed">
                  These templates are pre-formatted for direct upload. Do not change column headers or sheet names to ensure successful parsing by our CO-PO engine.
                </p>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] text-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <FileSpreadsheet size={150} />
              </div>
            </div>
          </div>

          {/* Instructions / Preview Area */}
          <div className="lg:col-span-8">
            <Card className="p-0 border-none shadow-2xl bg-white/80 backdrop-blur-md rounded-[2.5rem] overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30">
                <h3 className="text-2xl font-bold text-slate-900 font-display">Template Preview & Standards</h3>
                <p className="text-slate-500 mt-2 font-medium">Verify your data format against our institutional schema before bulk uploading.</p>
              </div>
              
              <div className="flex-1 p-12 flex flex-col items-center justify-center text-center">
                <div className="p-10 bg-blue-50/50 rounded-[3rem] text-blue-600 mb-10 shadow-inner">
                  <FileSpreadsheet size={100} strokeWidth={1} />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Generate to Preview</h3>
                <p className="text-slate-500 max-w-lg mt-6 leading-relaxed font-medium text-lg">
                  Select a category from the configuration panel to generate a pre-validated Excel workbook. These sheets include all required validation logic for the SECE portal.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16 w-full max-w-2xl text-left">
                  <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-lg font-bold text-slate-800">Pre-validated Schema</div>
                    <p className="text-sm text-slate-400 font-medium mt-3 leading-relaxed">Columns are locked and data types are pre-set to prevent import failures.</p>
                  </div>
                  <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-6">
                      <ListChecks size={24} />
                    </div>
                    <div className="text-lg font-bold text-slate-800">Smart Mapping</div>
                    <p className="text-sm text-slate-400 font-medium mt-3 leading-relaxed">Templates automatically link with existing course codes and roll numbers.</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Compatible with Microsoft Excel 2016+ and Google Sheets</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Missing icon used in code
function Activity({ size }) {
  return <Info size={size} />;
}
