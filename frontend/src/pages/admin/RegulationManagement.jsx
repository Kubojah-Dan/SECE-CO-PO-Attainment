import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Settings2, Trash2, Edit3, 
  CheckCircle2, AlertTriangle, Info, Calendar, X, Loader2
} from 'lucide-react';
import { regulationService } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { toast } from 'react-toastify';

export default function RegulationManagement() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    effective_from: '', 
    is_active: true,
    academic_rules: {
      cia_weightage: 50,
      ese_weightage: 50,
      passing_marks: 50
    }
  });

  const { data: regulations, isLoading } = useQuery({
    queryKey: ['regulations'],
    queryFn: () => regulationService.list().then(res => res.data)
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingReg 
      ? regulationService.update(editingReg.id, data)
      : regulationService.create(data),
    onSuccess: () => {
      toast.success(`Regulation ${editingReg ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries(['regulations']);
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save regulation')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => regulationService.delete(id),
    onSuccess: () => {
      toast.success('Regulation deleted');
      queryClient.invalidateQueries(['regulations']);
    }
  });

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      effective_from: '', 
      is_active: true,
      academic_rules: {
        cia_weightage: 50,
        ese_weightage: 50,
        passing_marks: 50
      }
    });
    setEditingReg(null);
  };

  const handleEdit = (reg) => {
    setEditingReg(reg);
    setFormData({
      name: reg.name,
      description: reg.description,
      effective_from: reg.effective_from || '',
      is_active: reg.is_active,
      academic_rules: reg.academic_rules || { cia_weightage: 50, ese_weightage: 50, passing_marks: 50 }
    });
    setIsModalOpen(true);
  };

  if (isLoading) return (
    <div className="h-96 flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 font-display italic uppercase tracking-tighter">Academic Regulations</h1>
          <p className="text-slate-500 font-medium text-sm">Manage institutional assessment patterns and passing rules</p>
        </div>
        <Button 
          variant="primary" 
          icon={Plus} 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="rounded-2xl shadow-xl shadow-blue-100 h-14 px-8"
        >
          Add New Regulation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regulations?.map((reg) => (
          <Card key={reg.id} className="relative overflow-hidden group border-slate-100 hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 font-display">{reg.name}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black mt-2 tracking-widest ${
                  reg.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {reg.is_active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(reg)}
                  className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => { if(window.confirm('Delete this regulation?')) deleteMutation.mutate(reg.id); }}
                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed line-clamp-2">{reg.description || 'No description provided.'}</p>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-2 uppercase tracking-widest"><Settings2 size={14} /> CIA</span>
                <span className="text-slate-900">{reg.academic_rules?.cia_weightage}%</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-2 uppercase tracking-widest"><Settings2 size={14} /> ESE</span>
                <span className="text-slate-900">{reg.academic_rules?.ese_weightage}%</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-2 uppercase tracking-widest"><CheckCircle2 size={14} /> Passing</span>
                <span className="text-slate-900">{reg.academic_rules?.passing_marks}%</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-2 uppercase tracking-widest"><Calendar size={14} /> Effective</span>
                <span className="text-slate-900">{reg.effective_from || 'N/A'}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 bg-slate-50 -mx-6 -mb-6 p-6 flex items-center gap-3 border-t border-slate-100">
              <Info size={16} className="text-blue-500 flex-shrink-0" />
              <p className="text-[10px] text-slate-400 font-bold leading-tight">Institutional rules for all batches under this cycle.</p>
            </div>
          </Card>
        ))}

        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all group min-h-[300px]"
        >
          <div className="p-5 bg-slate-50 rounded-3xl group-hover:bg-white group-hover:shadow-xl transition-all mb-4">
            <Plus size={32} />
          </div>
          <span className="font-black text-sm uppercase tracking-widest">New Regulation</span>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-display italic uppercase tracking-tighter">
                  {editingReg ? 'Update Regulation' : 'Define New Regulation'}
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Assessment weightages & passing rules</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-100 shadow-sm">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(formData); }} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regulation Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. R2023"
                      className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Effective Date</label>
                    <input 
                      type="date" 
                      className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700"
                      value={formData.effective_from}
                      onChange={e => setFormData({...formData, effective_from: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    placeholder="Brief description of the regulation..."
                    className="form-input rounded-2xl border-slate-100 h-[148px] font-medium text-slate-600 p-4"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                <h4 className="text-sm font-black text-slate-900 font-display italic uppercase tracking-tighter mb-6 flex items-center gap-2">
                  <Settings2 size={18} className="text-blue-500" /> Academic Rule Engine
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIA %</label>
                    <input 
                      type="number" 
                      className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700 text-center"
                      value={formData.academic_rules.cia_weightage}
                      onChange={e => setFormData({
                        ...formData, 
                        academic_rules: { ...formData.academic_rules, cia_weightage: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ESE %</label>
                    <input 
                      type="number" 
                      className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700 text-center"
                      value={formData.academic_rules.ese_weightage}
                      onChange={e => setFormData({
                        ...formData, 
                        academic_rules: { ...formData.academic_rules, ese_weightage: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pass %</label>
                    <input 
                      type="number" 
                      className="form-input rounded-2xl border-slate-100 h-14 font-bold text-slate-700 text-center"
                      value={formData.academic_rules.passing_marks}
                      onChange={e => setFormData({
                        ...formData, 
                        academic_rules: { ...formData.academic_rules, passing_marks: parseInt(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="reg_active"
                    className="w-6 h-6 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500/20"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <label htmlFor="reg_active" className="text-xs font-bold text-slate-600">Active Regulation</label>
                </div>
                <button 
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white h-16 px-12 rounded-3xl font-black text-lg shadow-xl shadow-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending ? <Loader2 className="animate-spin" /> : editingReg ? 'Update Regulation' : 'Create Regulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
