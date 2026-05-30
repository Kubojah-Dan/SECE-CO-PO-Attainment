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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--surface-tertiary)] text-[var(--text-muted)] hover:text-[var(--primary-500)] rounded-xl transition-all">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Excel Automation</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Smart template generation for high-speed institutional data entry</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', border: '1px solid var(--primary-100)' }}>
          <Info size={13} /> Live Sync Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Generator Controls */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <div className="p-1.5 bg-[var(--primary-50)] rounded-lg text-[var(--primary-500)]"><Settings2 size={16} /></div>
              Configuration
            </h3>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-3">Template Type</label>
                <div className="grid gap-2">
                  {[
                    { id: 'marks', label: 'Marks Entry Grid', icon: Table, desc: 'For CIA and ESE marks' },
                    { id: 'students', label: 'Student Batch Import', icon: Users, desc: 'Bulk enrollment sheets' },
                    { id: 'subjects', label: 'Course Catalog', icon: FileSpreadsheet, desc: 'Master subject definitions' },
                  ].map(type => (
                    <button key={type.id} onClick={() => setSelectedType(type.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selectedType === type.id
                          ? 'border-[var(--primary-400)] bg-[var(--primary-50)] text-[var(--primary-700)]'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:border-[var(--primary-200)]'
                      }`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 ${ selectedType === type.id ? 'text-white' : 'bg-white text-[var(--text-muted)]' }`} style={selectedType === type.id ? { background: 'var(--primary-500)' } : {}}>
                        <type.icon size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{type.label}</div>
                        <div className="text-[10px] opacity-60 mt-0.5">{type.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--border)]">
                <button onClick={handleGenerate} disabled={isGenerating}
                  className="w-full py-3 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all"
                  style={{ background: 'var(--primary-500)' }}
                  onMouseEnter={e => !isGenerating && (e.currentTarget.style.background = 'var(--primary-600)')}
                  onMouseLeave={e => !isGenerating && (e.currentTarget.style.background = 'var(--primary-500)')}
                >
                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isGenerating ? 'Generating...' : 'Download Template'}
                </button>
              </div>
            </div>
          </Card>
          <div className="p-5 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface-secondary)' }}>
            <div className="flex items-center gap-2 text-[var(--primary-500)] mb-2">
              <Info size={15} />
              <span className="text-xs font-semibold">Automation Tip</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Templates are pre-formatted for direct upload. Do not change column headers or sheet names to ensure successful parsing.
            </p>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-8">
          <Card className="border-[var(--border)] flex flex-col min-h-[420px]">
            <div className="pb-4 mb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Template Preview &amp; Standards</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Verify your data format against our institutional schema before bulk uploading.</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="p-6 rounded-2xl mb-6" style={{ background: 'var(--primary-50)' }}>
                <FileSpreadsheet size={48} strokeWidth={1.5} style={{ color: 'var(--primary-500)' }} />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Generate to Preview</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mt-2 leading-relaxed">
                Select a template type and click Download to generate a pre-validated Excel workbook with all required validation logic.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full max-w-lg text-left">
                <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface-secondary)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Pre-validated Schema</div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">Columns are locked and data types are pre-set to prevent import failures.</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface-secondary)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-purple-50 text-purple-500">
                    <ListChecks size={16} />
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Smart Mapping</div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">Templates auto-link with existing course codes and roll numbers.</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border)] text-center">
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest">Compatible with Microsoft Excel 2016+ and Google Sheets</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Activity({ size }) {
  return <Info size={size} />;
}
