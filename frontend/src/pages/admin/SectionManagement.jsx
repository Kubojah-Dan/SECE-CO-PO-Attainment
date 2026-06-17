import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Layout, 
  Trash2, Edit2, X, Activity,
  Save, Loader2, ChevronRight, GraduationCap, Calendar, Settings, Layers
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { departmentService, regulationService } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';

export default function SectionManagement() {
  const location = useLocation();
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [regulations, setRegulations] = useState([]);
  
  const [selectedDept, setSelectedDept] = useState(location.state?.departmentId || '');
  const [selectedProg, setSelectedProg] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  
  const [isLoadingProgs, setIsLoadingProgs] = useState(false);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Modals state
  const [isProgModalOpen, setIsProgModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState(null);
  
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  
  const [isSecModalOpen, setIsSecModalOpen] = useState(false);
  const [editingSec, setEditingSec] = useState(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchRegulations();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchProgrammes(selectedDept);
      setSelectedProg('');
      setSelectedBatch('');
      setBatches([]);
      setSections([]);
    } else {
      setProgrammes([]);
      setSelectedProg('');
      setSelectedBatch('');
      setBatches([]);
      setSections([]);
    }
  }, [selectedDept]);

  useEffect(() => {
    if (selectedProg) {
      fetchBatches(selectedProg);
      setSelectedBatch('');
      setSections([]);
    } else {
      setBatches([]);
      setSelectedBatch('');
      setSections([]);
    }
  }, [selectedProg]);

  useEffect(() => {
    if (selectedBatch) {
      fetchSections(selectedBatch);
    } else {
      setSections([]);
    }
  }, [selectedBatch]);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.list();
      setDepartments(res.data.results || res.data);
    } catch (err) { toast.error('Failed to load departments'); }
  };

  const fetchRegulations = async () => {
    try {
      const res = await regulationService.list();
      setRegulations(res.data.results || res.data);
    } catch (err) { toast.error('Failed to load regulations'); }
  };

  const fetchProgrammes = async (deptId) => {
    setIsLoadingProgs(true);
    try {
      const res = await departmentService.listProgrammes({ department: deptId });
      setProgrammes(res.data.results || res.data);
    } catch (err) { 
      console.error(err);
      toast.error('Failed to load programmes'); 
    } finally {
      setIsLoadingProgs(false);
    }
  };

  const fetchBatches = async (progId) => {
    setIsLoadingBatches(true);
    try {
      const res = await departmentService.listBatches({ programme: progId });
      setBatches(res.data.results || res.data);
    } catch (err) { 
      console.error(err);
      toast.error('Failed to load batches'); 
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const fetchSections = async (batchId) => {
    setIsLoadingSections(true);
    try {
      const res = await departmentService.listSections({ batch: batchId });
      setSections(res.data.results || res.data);
    } catch (err) { 
      console.error(err);
      toast.error('Failed to load sections'); 
    } finally {
      setIsLoadingSections(false);
    }
  };

  // ── Programme CRUD ───────────────────────────────────────────
  const handleSaveProgramme = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      degree_type: formData.get('degree_type'),
      duration_years: parseInt(formData.get('duration_years')),
      total_semesters: parseInt(formData.get('total_semesters')),
      regulation: formData.get('regulation') || null,
      department: selectedDept
    };

    try {
      if (editingProg) {
        await departmentService.updateProgramme(editingProg.id, data);
        toast.success('Programme updated successfully');
      } else {
        await departmentService.createProgramme(data);
        toast.success('Programme created successfully');
      }
      setIsProgModalOpen(false);
      fetchProgrammes(selectedDept);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save programme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProgramme = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this programme? All batches and sections under it will also be deleted.')) return;
    try {
      await departmentService.deleteProgramme(id);
      toast.success('Programme removed');
      fetchProgrammes(selectedDept);
      if (selectedProg === id) {
        setSelectedProg('');
        setBatches([]);
        setSections([]);
      }
    } catch (err) { toast.error('Failed to delete programme'); }
  };

  // ── Batch CRUD ───────────────────────────────────────────────
  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target);
    const start_year = parseInt(formData.get('start_year'));
    const end_year = parseInt(formData.get('end_year'));
    const data = {
      start_year,
      end_year,
      label: `${start_year}-${end_year}`,
      regulation: formData.get('regulation') || null,
      programme: selectedProg
    };

    try {
      if (editingBatch) {
        await departmentService.updateBatch(editingBatch.id, data);
        toast.success('Batch updated successfully');
      } else {
        await departmentService.createBatch(data);
        toast.success('Batch created successfully');
      }
      setIsBatchModalOpen(false);
      fetchBatches(selectedProg);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save batch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBatch = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this batch? All sections under it will also be deleted.')) return;
    try {
      await departmentService.deleteBatch(id);
      toast.success('Batch removed');
      fetchBatches(selectedProg);
      if (selectedBatch === id) {
        setSelectedBatch('');
        setSections([]);
      }
    } catch (err) { toast.error('Failed to delete batch'); }
  };

  // ── Section CRUD ─────────────────────────────────────────────
  const handleSaveSection = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      strength: parseInt(formData.get('strength')),
      batch: selectedBatch
    };

    try {
      if (editingSec) {
        await departmentService.updateSection(editingSec.id, data);
        toast.success('Section updated successfully');
      } else {
        await departmentService.createSection(data);
        toast.success('Section created successfully');
      }
      setIsSecModalOpen(false);
      fetchSections(selectedBatch);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this section?')) return;
    try {
      await departmentService.deleteSection(id);
      toast.success('Section removed');
      fetchSections(selectedBatch);
    } catch (err) { toast.error('Failed to delete section'); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Academic Structure Console</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure institutional Programmes, Batches, and Class Sections in one unified manager.</p>
      </div>

      {/* Select Department */}
      <div className="max-w-md space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Department</label>
        <select 
          value={selectedDept} 
          onChange={(e) => setSelectedDept(e.target.value)}
          className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] font-medium text-sm shadow-sm transition-all"
        >
          <option value="">Select Department</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.short_name}){d.is_first_year ? ' — First Year' : ''}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <Card className="p-6 flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="text-blue-500" size={18} />
                1. Programmes
              </h3>
              <p className="text-xs text-slate-400">Undergraduate & Postgraduate degrees</p>
            </div>
            {selectedDept && (
              <button 
                onClick={() => { setEditingProg(null); setIsProgModalOpen(true); }}
                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all"
                title="Add Programme"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {!selectedDept ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <Building2 size={36} className="opacity-30" />
              <p className="text-sm font-semibold">Select a Department to view programmes</p>
            </div>
          ) : isLoadingProgs ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : programmes.length > 0 ? (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px]">
              {programmes.map((prog) => (
                <div 
                  key={prog.id}
                  onClick={() => setSelectedProg(prog.id)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between group ${
                    selectedProg === prog.id 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/15 font-bold' 
                      : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{prog.name}</p>
                    <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                      selectedProg === prog.id ? 'text-blue-100' : 'text-slate-400'
                    }`}>
                      {prog.degree_type} • {prog.duration_years} Years • {prog.regulation_name || 'No Regulation'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingProg(prog); setIsProgModalOpen(true); }}
                      className={`p-1.5 rounded-lg transition-all ${
                        selectedProg === prog.id ? 'hover:bg-blue-700 text-white' : 'hover:bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteProgramme(prog.id, e)}
                      className={`p-1.5 rounded-lg transition-all ${
                        selectedProg === prog.id ? 'hover:bg-blue-700 text-white' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <GraduationCap size={36} className="opacity-30" />
              <p className="text-sm font-semibold">No programmes created yet</p>
              <button 
                onClick={() => { setEditingProg(null); setIsProgModalOpen(true); }}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline"
              >
                Create one now
              </button>
            </div>
          )}
        </Card>

        <Card className="p-6 flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="text-indigo-500" size={18} />
                2. Batches
              </h3>
              <p className="text-xs text-slate-400">Academic years for selected degree</p>
            </div>
            {selectedProg && (
              <button 
                onClick={() => { setEditingBatch(null); setIsBatchModalOpen(true); }}
                className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"
                title="Add Batch"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {!selectedProg ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <GraduationCap size={36} className="opacity-30" />
              <p className="text-sm font-semibold">Select a Programme to view batches</p>
            </div>
          ) : isLoadingBatches ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
            </div>
          ) : batches.length > 0 ? (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px]">
              {batches.map((batch) => (
                <div 
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch.id)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all flex items-center justify-between group ${
                    selectedBatch === batch.id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/15 font-bold' 
                      : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">Batch {batch.label}</p>
                    <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                      selectedBatch === batch.id ? 'text-indigo-100' : 'text-slate-400'
                    }`}>
                      {batch.start_year} - {batch.end_year}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingBatch(batch); setIsBatchModalOpen(true); }}
                      className={`p-1.5 rounded-lg transition-all ${
                        selectedBatch === batch.id ? 'hover:bg-indigo-700 text-white' : 'hover:bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteBatch(batch.id, e)}
                      className={`p-1.5 rounded-lg transition-all ${
                        selectedBatch === batch.id ? 'hover:bg-indigo-700 text-white' : 'hover:bg-red-50 text-red-500'
                      }`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <Calendar size={36} className="opacity-30" />
              <p className="text-sm font-semibold">No batches created yet</p>
              <button 
                onClick={() => { setEditingBatch(null); setIsBatchModalOpen(true); }}
                className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
              >
                Create one now
              </button>
            </div>
          )}
        </Card>

        <Card className="p-6 flex flex-col min-h-[200px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Layout className="text-emerald-500" size={18} />
                3. Sections
              </h3>
              <p className="text-xs text-slate-400">Classroom divisions (A, B, C...)</p>
            </div>
            {selectedBatch && (
              <button 
                onClick={() => { setEditingSec(null); setIsSecModalOpen(true); }}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all"
                title="Add Section"
              >
                <Plus size={16} />
              </button>
            )}
          </div>

          {!selectedBatch ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <Calendar size={36} className="opacity-30" />
              <p className="text-sm font-semibold">Select a Batch to view sections</p>
            </div>
          ) : isLoadingSections ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
            </div>
          ) : sections.length > 0 ? (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px]">
              {sections.map((sec) => (
                <div 
                  key={sec.id}
                  className="p-4 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-2xl flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-inner uppercase">
                      {sec.name}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Section {sec.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Strength: {sec.strength}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingSec(sec); setIsSecModalOpen(true); }}
                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-all"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteSection(sec.id, e)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
              <Layout size={36} className="opacity-30" />
              <p className="text-sm font-semibold">No sections created yet</p>
              <button 
                onClick={() => { setEditingSec(null); setIsSecModalOpen(true); }}
                className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
              >
                Create one now
              </button>
            </div>
          )}
        </Card>

      </div>

      {/* ── PROGRAMME MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {isProgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsProgModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">{editingProg ? 'Update Programme' : 'Add Programme'}</h3>
                <button onClick={() => setIsProgModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProgramme} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Programme Name</label>
                  <input 
                    name="name" 
                    defaultValue={editingProg?.name} 
                    placeholder="B.E. Artificial Intelligence & Machine Learning"
                    required 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Degree Type</label>
                    <select 
                      name="degree_type"
                      defaultValue={editingProg?.degree_type || 'UG'}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm"
                    >
                      <option value="UG">Undergraduate (UG)</option>
                      <option value="PG">Postgraduate (PG)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Regulation</label>
                    <select 
                      name="regulation"
                      defaultValue={editingProg?.regulation || ''}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm"
                    >
                      <option value="">Select Regulation</option>
                      {regulations.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Duration (Years)</label>
                    <input 
                      name="duration_years" 
                      type="number"
                      defaultValue={editingProg?.duration_years || 4} 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Semesters</label>
                    <input 
                      name="total_semesters" 
                      type="number"
                      defaultValue={editingProg?.total_semesters || 8} 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                    />
                  </div>
                </div>

                <button 
                  disabled={isSaving}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold mt-4 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Programme
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BATCH MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBatchModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">{editingBatch ? 'Update Batch' : 'Add Batch'}</h3>
                <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveBatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Start Year</label>
                    <input 
                      name="start_year" 
                      type="number"
                      defaultValue={editingBatch?.start_year || 2024} 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">End Year</label>
                    <input 
                      name="end_year" 
                      type="number"
                      defaultValue={editingBatch?.end_year || 2028} 
                      required 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Regulation</label>
                  <select 
                    name="regulation"
                    defaultValue={editingBatch?.regulation || ''}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm"
                  >
                    <option value="">Select Regulation</option>
                    {regulations.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <button 
                  disabled={isSaving}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold mt-4 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Batch
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SECTION MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isSecModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSecModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900">{editingSec ? 'Update Section' : 'Add Section'}</h3>
                <button onClick={() => setIsSecModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSection} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Section Name (e.g. A, B, C)</label>
                  <input 
                    name="name" 
                    defaultValue={editingSec?.name} 
                    required 
                    maxLength={2} 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-lg uppercase" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Student Strength</label>
                  <input 
                    name="strength" 
                    type="number" 
                    defaultValue={editingSec?.strength || 60} 
                    required 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold" 
                  />
                </div>

                <button 
                  disabled={isSaving}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold mt-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 transition-all"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Section
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
