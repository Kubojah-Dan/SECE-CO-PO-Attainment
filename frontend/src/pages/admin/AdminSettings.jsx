import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Bell, Database, 
  Globe, Lock, Save, Trash2, Sliders, CheckCircle,
  Loader2, RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { attainmentService } from '../../services/api';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const data = await attainmentService.getGlobalConfig();
      setConfig(data);
    } catch (error) {
      toast.error('Failed to load system configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (!config) return;
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleInitialize = async () => {
    setIsSaving(true);
    try {
      // Create default global config (department = null)
      const defaultConfig = {
        threshold_marks_pct: 60,
        level1_student_pct: 50,
        level2_student_pct: 60,
        level3_student_pct: 70,
        direct_weightage: 80,
        indirect_weightage: 20,
        target_co_level: 2,
        target_po_attainment: 60,
        cia_best_of: 2
      };
      const response = await attainmentService.createConfig(defaultConfig);
      setConfig(response.data);
      toast.success('System configurations initialized');
    } catch (error) {
      toast.error('Failed to initialize settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!config?.id) return;
    setIsSaving(true);
    try {
      await attainmentService.updateConfig(config.id, config);
      toast.success('Platform configurations updated successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-9 h-9 animate-spin" style={{ color: 'var(--primary-500)' }} />
        <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest font-medium">Syncing settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center py-32 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-50)', color: 'var(--accent-500)' }}>
          <Settings size={32} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Settings Not Initialized</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-md mx-auto">The global attainment engine configuration is missing. Initialize the system with institutional defaults.</p>
        </div>
        <button onClick={handleInitialize} disabled={isSaving} className="text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all" style={{ background: 'var(--primary-500)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}>
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Initialize System Config
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Platform Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure global attainment thresholds and system parameters</p>
        </div>
        {hasChanges && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest border border-amber-100">
            <RefreshCw size={12} /> Unsaved Changes
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Attainment Configuration */}
        <Card title="Attainment Logic" icon={Sliders}>
          <div className="space-y-8 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Institutional Target Attainment (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] transition-all font-semibold" 
                    value={config.target_co_level} 
                    onChange={(e) => handleChange('target_co_level', Number(e.target.value))}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">Level</div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Standard target level for all Course Outcomes.</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Threshold Marks for CO (%)
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] transition-all font-semibold" 
                    value={config.threshold_marks_pct} 
                    onChange={(e) => handleChange('threshold_marks_pct', Number(e.target.value))}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Marks percentage required to consider a CO as attained.</p>
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-50">
              <h5 className="text-xs font-bold text-slate-900 mb-6 uppercase tracking-widest">Attainment Level Mapping (Student %)</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Level 1 Threshold', field: 'level1_student_pct', color: 'blue' },
                  { label: 'Level 2 Threshold', field: 'level2_student_pct', color: 'indigo' },
                  { label: 'Level 3 Threshold', field: 'level3_student_pct', color: 'violet' },
                ].map((lvl) => (
                  <div key={lvl.field} className="p-5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      {lvl.label}
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-full bg-transparent border-b-2 border-[var(--border)] outline-none focus:border-[var(--primary-500)] transition-all font-semibold text-xl py-1" 
                        value={config[lvl.field]} 
                        onChange={(e) => handleChange(lvl.field, Number(e.target.value))}
                      />
                      <div className="absolute right-0 bottom-2 text-slate-300 text-xs">%</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-4 font-medium italic">
                * Percent of students who must meet threshold marks to achieve the respective level.
              </p>
            </div>
          </div>
        </Card>

        {/* Weightage Distribution */}
        <Card title="Assessment Weightage" icon={Database}>
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Direct Attainment (%)</label>
                <input 
                  type="number" 
                    className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] transition-all font-semibold" 
                  value={config.direct_weightage} 
                  onChange={(e) => handleChange('direct_weightage', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Indirect Attainment (%)</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold" 
                  value={config.indirect_weightage} 
                  onChange={(e) => handleChange('indirect_weightage', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
              <Shield className="text-blue-500" size={20} />
              <p className="text-xs font-bold text-blue-700">Total weightage must equal 100% for mathematical consistency.</p>
            </div>
          </div>
        </Card>

        {/* Security & Access */}
        <Card title="Security & Compliance" icon={Lock}>
          <div className="space-y-4 mt-6">
            {[
              { label: 'Two-Factor Authentication', desc: 'Require 2FA for all HOD and Admin accounts', active: false },
              { label: 'Automatic Data Backup', desc: 'Daily snapshot of all attainment records to AWS S3', active: true },
            ].map((sec, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--surface-secondary)' }}>
                <div>
                  <p className="font-bold text-slate-900">{sec.label}</p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{sec.desc}</p>
                </div>
                <div className={`w-14 h-8 rounded-full relative p-1 transition-colors ${sec.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'}`}>
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${sec.active ? 'ml-auto' : 'ml-0'}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col md:flex-row justify-end gap-4 pt-8 border-t border-slate-100">
          <button disabled={!hasChanges || isSaving} onClick={fetchConfig} className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${ hasChanges ? 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border)]' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] cursor-not-allowed' }`}>Discard</button>
          <button disabled={!hasChanges || isSaving} onClick={handleSave} className={`px-8 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${ hasChanges ? 'text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] cursor-not-allowed' }`} style={hasChanges ? { background: 'var(--primary-500)' } : {}} onMouseEnter={e => hasChanges && (e.currentTarget.style.background = 'var(--primary-600)')} onMouseLeave={e => hasChanges && (e.currentTarget.style.background = 'var(--primary-500)')}>
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
