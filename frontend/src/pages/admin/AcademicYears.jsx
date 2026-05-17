import React, { useState } from 'react';
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

  const { data: years, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => subjectService.listYears().then(res => res.data)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingYear 
      ? subjectService.updateYear(editingYear.id, data)
      : subjectService.createYear(data),
    onSuccess: () => {
      toast.success(`Academic Year ${editingYear ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries(['academic-years']);
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save academic year')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => subjectService.deleteYear(id),
    onSuccess: () => {
      toast.success('Academic Year deleted');
      queryClient.invalidateQueries(['academic-years']);
    }
  });

  const setCurrentMutation = useMutation({
    mutationFn: (id) => subjectService.setCurrentYear(id),
    onSuccess: () => {
      toast.success('Current academic year updated');
      queryClient.invalidateQueries(['academic-years']);
    }
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
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 font-display italic uppercase tracking-tighter">Academic Cycles</h1>
          <p className="text-gray-500 font-medium text-sm mt-1">Configure active academic cycles and institutional timelines</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-slate-200"
        >
          <Plus size={18} /> New Cycle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {years?.map((year) => (
          <Card key={year.id} className="relative overflow-hidden group border-slate-100 hover:border-blue-200 transition-all">
            {year.is_current && (
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-lg z-10">
                Active Year
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                  year.is_current ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-100 text-slate-400'
                }`}>
                  <CalendarDays size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-display">AY {year.label}</h3>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                      <Clock size={12} className="text-blue-500" /> {year.start_date || 'N/A'} to {year.end_date || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!year.is_current && (
                  <button 
                    onClick={() => setCurrentMutation.mutate(year.id)}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                  >
                    Set as Active
                  </button>
                )}
                <button 
                  onClick={() => handleEdit(year)}
                  className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                {!year.is_current && (
                  <button 
                    onClick={() => { if(window.confirm('Delete this year?')) deleteMutation.mutate(year.id); }}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
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
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 font-display italic uppercase tracking-tighter">
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
