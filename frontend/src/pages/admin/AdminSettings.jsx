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
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
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
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Core Engine Settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-ui">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">Platform Settings</h1>
          <p className="text-slate-500 mt-1">Configure global attainment thresholds and system parameters</p>
        </div>
        {hasChanges && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-amber-100"
          >
            <RefreshCw size={14} className="animate-spin-slow" />
            Unsaved Changes Pending
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
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-lg" 
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
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-lg" 
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
                  <div key={lvl.field} className={`p-6 rounded-3xl bg-slate-50 border border-slate-100`}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                      {lvl.label}
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-full bg-transparent border-b-2 border-slate-200 outline-none focus:border-blue-500 transition-all font-bold text-2xl py-1" 
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
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold" 
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
              <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
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
          <button 
            disabled={!hasChanges || isSaving}
            onClick={fetchConfig}
            className={`px-10 py-4 rounded-2xl font-bold transition-all ${
              hasChanges 
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95' 
                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
          >
            Discard Changes
          </button>
          <button 
            disabled={!hasChanges || isSaving}
            onClick={handleSave}
            className={`px-12 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
              hasChanges 
                ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 active:scale-95' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Synchronizing...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
