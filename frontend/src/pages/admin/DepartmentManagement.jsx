import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, 
  Users, GraduationCap,
  Loader2, Trash2, Edit2, X, Activity,
  ArrowRight, Save, Layout
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { departmentService } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

export default function DepartmentManagement() {

  const DEPT_COLORS = [
    { bg: 'var(--primary-100)', text: 'var(--primary-600)' },
    { bg: 'var(--accent-100)',  text: 'var(--accent-600)' },
    { bg: '#D1FAE5',            text: '#059669' },
    { bg: '#FEE2E2',            text: '#DC2626' },
    { bg: '#EDE9FE',            text: '#7C3AED' },
    { bg: '#FCE7F3',            text: '#BE185D' },
  ];
  const getDeptColor = (name = '') => DEPT_COLORS[name.charCodeAt(0) % DEPT_COLORS.length];
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [editingDept, setEditingDept] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await departmentService.list();
      const data = response.data.results || (Array.isArray(response.data) ? response.data : []);
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      setDepartments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This will impact all faculty and students in this department.')) return;
    setIsDeleting(id);
    try {
      await departmentService.delete(id);
      setDepartments(prev => prev.filter(d => d.id !== id));
      toast.success('Department removed successfully');
    } catch (error) {
      toast.error('Failed to remove department. Ensure it has no active programmes.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (dept) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingDept(null);
  };

  const filteredDepts = departments.filter(d => 
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Institutional Departments</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage academic departments and their administrative hierarchy</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all"
          style={{ background: 'var(--primary-500)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by department name or code..."
          className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Academic Depts', value: departments.length, icon: Building2, color: 'blue' },
          { label: 'Active Status', value: 'Live', icon: Activity, color: 'emerald' },
          { label: 'System Health', value: 'Optimal', icon: Users, color: 'purple' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 border-none shadow-md bg-white">
            <div className="flex items-center gap-4">
              <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl`}><stat.icon size={20} /></div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Department Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-48 animate-pulse shadow-sm border border-slate-100" />
          ))
        ) : filteredDepts.length > 0 ? (
          filteredDepts.map((dept) => (
            <motion.div
              key={dept.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-6 border-none shadow-lg bg-white hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between relative z-10">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner"
                    style={{ background: getDeptColor(dept.short_name || dept.name).bg, color: getDeptColor(dept.short_name || dept.name).text }}
                  >
                    {dept.short_name?.charAt(0) || dept.name?.charAt(0)}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEdit(dept)}
                      className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                      title="Edit Department"
                    >
                      <Edit2 size={16} />
                    </button>
                    <Link 
                      to="/admin/sections"
                      state={{ departmentId: dept.id }}
                      className="p-2 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                      title="Manage Sections"
                    >
                      <Layout size={16} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(dept.id)}
                      disabled={isDeleting === dept.id}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                    >
                      {isDeleting === dept.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mt-4 relative z-10">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{dept.short_name || dept.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">{dept.code}</p>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-300" />
                    <span className="text-xs font-bold text-slate-600">Faculty Sync</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-slate-300" />
                    <span className="text-xs font-bold text-slate-600">Live Analytics</span>
                  </div>
                </div>

                <div className="absolute right-[-20px] bottom-[-20px] text-blue-50/20 group-hover:text-blue-50/50 transition-colors -rotate-12 pointer-events-none">
                  <Building2 size={120} />
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
            <Building2 size={60} className="text-slate-100" />
            <h3 className="text-xl font-bold text-slate-900">No Departments Found</h3>
            <p className="text-slate-400 max-w-sm">Try searching with a different keyword or add a new department to the system.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Department Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleModalClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  {editingDept ? 'Update Department' : 'Create Department'}
                </h3>
                <button onClick={handleModalClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form className="space-y-4" onSubmit={async (e) => { 
                e.preventDefault(); 
                setIsSaving(true);
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                
                // Set default college (usually ID 1 for SECE)
                data.college = 1;

                try {
                  if (editingDept) {
                    await departmentService.update(editingDept.id, data);
                    toast.success('Department updated successfully');
                  } else {
                    await departmentService.create(data);
                    toast.success('Department registered successfully');
                  }
                  handleModalClose();
                  fetchDepartments();
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Failed to save department');
                } finally {
                  setIsSaving(false);
                }
              }}>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Department Name</label>
                  <input name="name" defaultValue={editingDept?.name} required type="text" className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] transition-all font-medium text-sm" placeholder="e.g. Mechanical Engineering" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Short Code</label>
                    <input name="code" defaultValue={editingDept?.code} required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="e.g. MECH" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Display Name</label>
                    <input name="short_name" defaultValue={editingDept?.short_name} required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="e.g. MECH" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">HOD Name</label>
                  <input name="hod_name" defaultValue={editingDept?.hod_name} type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="e.g. Dr. John Smith" />
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-3.5 text-white rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--primary-500)' }}
                  onMouseEnter={e => !isSaving && (e.currentTarget.style.background = 'var(--primary-600)')}
                  onMouseLeave={e => !isSaving && (e.currentTarget.style.background = 'var(--primary-500)')}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : (editingDept ? <Save size={16} /> : <ArrowRight size={16} />)}
                  {editingDept ? 'Update Details' : 'Register Department'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
