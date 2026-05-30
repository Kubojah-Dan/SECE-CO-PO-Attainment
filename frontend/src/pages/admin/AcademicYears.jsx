import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, Plus, Edit2, Trash2, 
  CheckCircle2, Clock, CalendarDays, X, Loader2
} from 'lucide-react';
import { subjectService } from '../../services/api';
import Card from '../../components/ui/Card';
import { toast } from 'react-toastify';

export default function AcademicYears() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [formData, setFormData] = useState({ label: '', start_date: '', end_date: '', is_current: false });

  const [years, setYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    setIsLoading(true);
    try {
      const res = await subjectService.listYears();
      const data = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setYears(data);
    } catch (error) {
      toast.error('Failed to load academic cycles');
      setYears([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data) => editingYear 
      ? subjectService.updateYear(editingYear.id, data)
      : subjectService.createYear(data),
    onSuccess: () => {
      toast.success(`Academic year ${editingYear ? 'updated' : 'created'} successfully`);
      fetchYears();
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save academic year')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => subjectService.deleteYear(id),
    onSuccess: () => {
      toast.success('Academic year deleted');
      fetchYears();
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id) => subjectService.setCurrentYear(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Current academic year updated');
      fetchYears();
    },
  });

  const resetForm = () => {
    setFormData({ label: '', start_date: '', end_date: '', is_current: false });
    setEditingYear(null);
  };

  const handleEdit = (year) => {
    setEditingYear(year);
    setFormData({
      label: year.label,
      start_date: year.start_date || '',
      end_date: year.end_date || '',
      is_current: year.is_current
    });
    setIsModalOpen(true);
  };

  if (isLoading) return (
    <div className="h-96 flex items-center justify-center">
      <Loader2 className="animate-spin text-[var(--primary-500)]" size={40} />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Academic Cycles</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure active academic cycles and institutional timelines</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all"
          style={{ background: 'var(--primary-500)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}
        >
          <Plus size={16} /> New Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {years?.map((year) => (
          <Card key={year.id} className="relative overflow-hidden group border-[var(--border)] hover:border-[var(--primary-200)] transition-all duration-300">
            {year.is_current && (
              <div className="absolute top-0 right-0 px-3 py-1 text-white text-[10px] font-semibold uppercase tracking-widest rounded-bl-xl z-10" style={{ background: 'var(--success)' }}>
                Active Year
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  year.is_current ? 'text-white shadow-md' : 'bg-[var(--surface-tertiary)] text-[var(--text-muted)]'
                }`} style={year.is_current ? { background: 'var(--primary-500)' } : {}}>
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">AY {year.label}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <Clock size={11} className="text-[var(--primary-400)]" /> {year.start_date || 'N/A'} to {year.end_date || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!year.is_current && (
                  <button 
                    onClick={() => setCurrentMutation.mutate(year.id)}
                    className="text-xs font-medium text-[var(--primary-500)] hover:bg-[var(--primary-50)] px-3 py-1.5 rounded-lg transition-all"
                  >
                    Set as Active
                  </button>
                )}
                <button 
                  onClick={() => handleEdit(year)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--primary-500)] hover:bg-[var(--primary-50)] rounded-xl transition-all"
                >
                  <Edit2 size={15} />
                </button>
                {!year.is_current && (
                  <button 
                    onClick={() => { if(window.confirm('Delete this year?')) deleteMutation.mutate(year.id); }}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-secondary)] flex items-center justify-between rounded-t-2xl">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {editingYear ? 'Edit Cycle' : 'New Academic Cycle'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle Label</label>
                <input 
                  type="text" 
                  placeholder="e.g. 2024-25"
                  className="form-input rounded-2xl border-slate-100 focus:ring-blue-500/20 h-14 font-bold text-slate-700"
                  value={formData.label}
                  onChange={e => setFormData({...formData, label: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    type="date" 
                    className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                  <input 
                    type="date" 
                    className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700"
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input 
                  type="checkbox" 
                  id="is_current"
                  className="w-5 h-5 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/20"
                  checked={formData.is_current}
                  onChange={e => setFormData({...formData, is_current: e.target.checked})}
                />
                <label htmlFor="is_current" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Set as institutional active year
                </label>
              </div>

              <button 
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-[24px] font-black text-lg shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2"
              >
                {saveMutation.isPending ? <Loader2 className="animate-spin" /> : editingYear ? 'Update Cycle' : 'Launch Cycle'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
