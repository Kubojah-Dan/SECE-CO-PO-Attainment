import React, { useState, useEffect } from 'react';
import { 
  BookMarked, Plus, Search, Filter, 
  Download, MoreVertical, BookOpen, Layers,
  Loader2, Trash2, Edit2, X
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { subjectService, departmentService } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const abbrevDept = (name) => {
  const abbreviations = {
    "Computer Science & Engineering (Artificial Intelligence & Machine Learning)": "CSE (AI&ML)",
    "Artificial Intelligence & Data Science": "AI&DS",
    "Computer Science & Engineering": "CSE",
    "Computer & Communication Engineering": "CCE",
    "Computer Science & Business Systems": "CSBS",
    "Computer Science & Engineering (Cyber Security)": "CSE (CY)",
    "Electrical & Electronics Engineering": "EEE",
    "Electronics & Communication Engineering (VLSI Design)": "ECE (VLSI)",
    "Mechanical Engineering": "MECH",
    "Electronics & Communication Engineering": "ECE",
    "Information Technology": "IT"
  };
  return abbreviations[name] || name;
};

export default function AdminSubjects() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  useEffect(() => {
    fetchSubjects();
    fetchDepartments();
  }, []);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const response = await subjectService.list();
      const data = response.data.results || (Array.isArray(response.data) ? response.data : []);
      setSubjects(data);
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.list();
      const data = response.data.results || (Array.isArray(response.data) ? response.data : []);
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    setIsDeleting(id);
    try {
      await subjectService.delete(id);
      setSubjects(prev => prev.filter(s => (s.id || s.subject_id) !== id));
      toast.success('Subject deleted successfully');
    } catch (error) {
      toast.error('Failed to delete subject');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const filteredSubjects = subjects.filter(s => {
    const code = (s.code || s.subject_code || '').toLowerCase();
    const name = (s.name || s.subject_name || '').toLowerCase();
    const dept = (s.dept || s.department_name || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return code.includes(query) || name.includes(query) || dept.includes(query);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Master Subject Directory</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage global course definitions and curriculum</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-all">
            <Download size={15} /> Export
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-all" style={{ background: 'var(--primary-500)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}>
            <Plus size={16} /> Define Subject
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input type="text" placeholder="Search by code, name or department..." className="w-full pl-11 pr-4 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] outline-none transition-all text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card className="p-0 overflow-hidden border-[var(--border)] shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Curriculum Data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Code & Name</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Department</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Curriculum Details</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubjects.length > 0 ? (
                  filteredSubjects.map((subject) => (
                    <tr key={subject.id || subject.subject_id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div>
                          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{subject.code || subject.subject_code}</div>
                          <div className="font-bold text-slate-900 mt-1 group-hover:text-blue-700 transition-colors">{subject.name || subject.subject_name}</div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wide">
                          {departments.find(d => d.id?.toString() === subject.department?.toString())?.short_name || 'General'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-blue-400" /> {subject.type || 'Theory'}</span>
                          <span className="flex items-center gap-1.5 border-l pl-5 border-slate-100"><Layers size={14} className="text-purple-400" /> Sem {subject.semester || 1}</span>
                          <span className="flex items-center gap-1.5 border-l pl-5 border-slate-100 text-slate-900">{subject.credits} Credits</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(subject)}
                            className="p-2.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(subject.id || subject.subject_id)}
                            disabled={isDeleting === (subject.id || subject.subject_id)}
                            className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                          >
                            {isDeleting === (subject.id || subject.subject_id) ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BookMarked size={48} className="text-slate-200" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No matches found in directory</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Define/Edit Subject Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-secondary)]">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{editingSubject ? 'Update Subject' : 'Define New Subject'}</h3>
                </div>
                <button onClick={handleModalClose} className="p-1.5 hover:bg-[var(--surface-tertiary)] rounded-lg text-[var(--text-muted)] transition-all">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6">
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  const formData = new FormData(e.target);
                  const data = Object.fromEntries(formData);
                  if (data.credits) data.credits = parseInt(data.credits);
                  if (data.semester) data.semester = parseInt(data.semester);
                  data.subject_code = data.code;
                  data.subject_name = data.name;
                  if (data.department) data.department_id = data.department;
                  try {
                    if (editingSubject) {
                      await subjectService.update(editingSubject.id || editingSubject.subject_id, data);
                      toast.success('Subject updated successfully');
                    } else {
                      await subjectService.create(data);
                      toast.success('Subject defined successfully');
                    }
                    handleModalClose();
                    fetchSubjects();
                  } catch (err) {
                    toast.error(err.response?.data?.message || 'Failed to save subject');
                  } finally {
                    setIsSaving(false);
                  }
                }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">Subject Code</label>
                      <input name="code" defaultValue={editingSubject?.code || editingSubject?.subject_code} required type="text" className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] transition-all font-medium text-sm" placeholder="e.g. CS8401" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">Credits</label>
                      <input name="credits" defaultValue={editingSubject?.credits} required type="number" className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] transition-all font-medium text-sm" placeholder="3" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">Subject Name</label>
                    <input name="name" defaultValue={editingSubject?.name || editingSubject?.subject_name} required type="text" className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] transition-all font-medium text-sm" placeholder="Database Management Systems" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">Department</label>
                      <select name="department" defaultValue={editingSubject?.department?.id || editingSubject?.department} required className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] transition-all font-medium text-sm">
                        <option value="">Select Dept</option>
                        {departments.map(dept => (<option key={dept.id} value={dept.id}>{abbrevDept(dept.name)}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest block mb-2">Semester</label>
                      <select name="semester" defaultValue={editingSubject?.semester || 1} required className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] transition-all font-medium text-sm">
                        {[1,2,3,4,5,6,7,8].map(sem => (<option key={sem} value={sem}>Semester {sem}</option>))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={isSaving} className="w-full py-2.5 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all" style={{ background: 'var(--primary-500)' }} onMouseEnter={e => !isSaving && (e.currentTarget.style.background = 'var(--primary-600)')} onMouseLeave={e => !isSaving && (e.currentTarget.style.background = 'var(--primary-500)')}>
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Subject'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
