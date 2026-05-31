import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, 
  Mail, Phone, Shield, MoreHorizontal,
  Download, Upload, Check, X, Loader2,
  Trash2, Edit2, Lock
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { userService, departmentService, staffService } from '../../services/api';
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

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  // Staff-specific state
  const [formRole, setFormRole] = useState('faculty');
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);

  const tabs = ['All', 'HOD', 'Faculty', 'Admin', 'IQAC', 'Staff'];

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await userService.list();
      const data = response.data.results || (Array.isArray(response.data) ? response.data : []);
      console.log('User Data:', data);
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.list();
      const data = response.data.results || (Array.isArray(response.data) ? response.data : []);
      console.log('Department Data:', data);
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user account?')) return;
    setIsDeleting(id);
    try {
      await userService.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success('User removed from system');
    } catch (error) {
      toast.error('Failed to remove user');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    const firstName = (user.first_name || '').toLowerCase();
    const lastName = (user.last_name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const dept = (user.department_name || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = 
      firstName.includes(query) ||
      lastName.includes(query) ||
      email.includes(query) ||
      dept.includes(query);
    
    const matchesTab = activeTab === 'All' || user.role?.toUpperCase() === activeTab.toUpperCase();
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">User Management</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage institutional roles, permissions and account access</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            id="bulk-import-input" 
            className="hidden" 
            accept=".csv,.xlsx,.xls"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const toastId = toast.loading('Processing bulk import...');
              try {
                const res = await userService.bulkCreate(file);
                const data = res.data;
                
                if (data.errors && data.errors.length > 0) {
                  const errorMsgs = data.errors.map(err => `Row ${err.row}: ${err.error || err.email}`).slice(0, 3).join(', ');
                  toast.update(toastId, { 
                    render: `Imported ${data.created_count} users. Errors: ${errorMsgs}${data.errors.length > 3 ? '...' : ''}`, 
                    type: 'warning', 
                    isLoading: false, 
                    autoClose: 8000 
                  });
                } else {
                  toast.update(toastId, { 
                    render: `Successfully imported ${data.created_count} users!`, 
                    type: 'success', 
                    isLoading: false, 
                    autoClose: 4000 
                  });
                }
                fetchUsers();
              } catch (err) {
                console.error(err);
                const errMsg = err.response?.data?.error || 'Import failed. Please check the Excel file formatting.';
                toast.update(toastId, { 
                  render: errMsg, 
                  type: 'error', 
                  isLoading: false, 
                  autoClose: 5000 
                });
              }
            }}
          />
          <button 
            onClick={() => document.getElementById('bulk-import-input').click()}
            className="flex items-center px-4 py-2.5 border border-[var(--border-strong)] rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-all"
          >
            <Upload className="w-4 h-4 mr-2 text-[var(--primary-500)]" />
            Bulk Import
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all"
            style={{ background: 'var(--primary-500)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex p-1 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] w-full md:w-auto">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'bg-white text-[var(--primary-600)] shadow-sm border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search by name, email or department..." className="w-full pl-11 pr-4 py-2.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] outline-none transition-all text-sm font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden p-0 border-[var(--border)] shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-9 h-9 animate-spin" style={{ color: 'var(--primary-500)' }} />
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest font-medium">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-5 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Identity</th>
                  <th className="py-5 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Role</th>
                  <th className="py-5 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Department</th>
                  <th className="py-5 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Account Status</th>
                  <th className="py-5 px-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="py-6 px-8">
                        <div className="flex items-center">
                          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold mr-4 shadow-lg shadow-blue-600/10 group-hover:scale-105 transition-transform">
                            {user.first_name?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{user.first_name} {user.last_name}</h4>
                            <p className="text-[11px] text-slate-400 flex items-center mt-1 font-medium">
                              <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-[var(--primary-100)] text-[var(--primary-600)]">
                          <Shield size={11} className="mr-1" />
                          {user.role}
                        </span>
                      </td>
                      <td className="py-6 px-8">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-tertiary)] text-[var(--text-secondary)]">
                          {(() => {
                            if (user.role === 'admin') return 'SECE (Admin)';
                            const deptId = user.faculty_profile?.department || user.hod_profile?.department || user.department || user.department_id;
                            const dept = departments.find(d => d.id?.toString() === deptId?.toString());
                            return dept?.short_name || 'N/A';
                          })()}
                        </span>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-[var(--border-strong)]'}`} />
                            <span className={`text-[11px] font-semibold ${user.is_online ? 'text-emerald-700' : 'text-[var(--text-muted)]'}`}>
                              {user.is_online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide ${user.is_active ? 'text-[var(--primary-500)]' : 'text-[var(--danger)]'}`}>
                            {user.is_active ? 'Account OK' : 'Locked'}
                          </span>
                        </div>
                      </td>
                      <td className="py-6 px-8 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-2.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            disabled={isDeleting === user.id}
                            className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                          >
                            {isDeleting === user.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Users size={48} className="text-slate-200" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">User directory is empty or no matches</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit User Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  {editingUser ? 'Update User Details' : 'Register New User'}
                </h3>
                <button onClick={handleModalClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form className="space-y-4" onSubmit={async (e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.target);
                const rawData = Object.fromEntries(formData);
                
                try {
                  setIsSaving(true);

                  // ── STAFF: use dedicated endpoint ──────────────────────────
                  if (rawData.role === 'staff') {
                    if (selectedDeptIds.length === 0) {
                      toast.error('Please assign at least one department for this staff member.');
                      setIsSaving(false);
                      return;
                    }
                    await staffService.createUser({
                      email: rawData.email,
                      first_name: rawData.first_name,
                      last_name: rawData.last_name,
                      employee_id: rawData.employee_id,
                      password: rawData.password,
                      department_ids: selectedDeptIds.map(Number),
                    });
                    toast.success('Staff user created successfully');
                    handleModalClose();
                    fetchUsers();
                    return;
                  }

                  // ── All other roles: existing FormData flow ────────────────
                  const payload = new FormData();
                  payload.append('email', rawData.email);
                  payload.append('first_name', rawData.first_name);
                  payload.append('last_name', rawData.last_name);
                  payload.append('role', rawData.role);
                  payload.append('phone', rawData.phone || '');
                  payload.append('is_active', editingUser ? editingUser.is_active : true);
                  
                  if (rawData.password) {
                    payload.append('password', rawData.password);
                  }

                  if (rawData.profile_photo instanceof File && rawData.profile_photo.size > 0) {
                    payload.append('profile_photo', rawData.profile_photo);
                  }

                  if (rawData.role === 'faculty') {
                    payload.append('faculty_profile.department', rawData.department);
                    payload.append('faculty_profile.employee_id', rawData.employee_id);
                  } else if (rawData.role === 'hod') {
                    payload.append('hod_profile.department', rawData.department);
                    payload.append('hod_profile.employee_id', rawData.employee_id);
                  }
                  
                  if (editingUser) {
                    await userService.update(editingUser.id, payload);
                    toast.success('User updated successfully');
                  } else {
                    await userService.create(payload);
                    toast.success('User registered successfully');
                  }
                  handleModalClose();
                  fetchUsers();
                } catch (err) {
                  const errDetail = err.response?.data;
                  const msg =
                    (typeof errDetail === 'string' ? errDetail : null) ||
                    errDetail?.detail ||
                    errDetail?.email?.[0] ||
                    errDetail?.employee_id?.[0] ||
                    errDetail?.department_ids?.[0] ||
                    errDetail?.non_field_errors?.[0] ||
                    errDetail?.message ||
                    'Failed to process user';
                  toast.error(msg);
                } finally {
                  setIsSaving(false);
                }
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">First Name</label>
                    <input name="first_name" defaultValue={editingUser?.first_name} required type="text" className="w-full p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] transition-all font-medium text-sm" placeholder="John" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Last Name</label>
                    <input name="last_name" defaultValue={editingUser?.last_name} required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="Doe" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Phone Number</label>
                    <input name="phone" defaultValue={editingUser?.phone} type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="+91 ..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Profile Photo</label>
                    <input name="profile_photo" type="file" accept="image/*" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Email Address</label>
                    <input name="email" defaultValue={editingUser?.email} required type="email" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="john.doe@sece.ac.in" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Employee ID</label>
                    <input 
                      name="employee_id" 
                      defaultValue={editingUser?.faculty_profile?.employee_id || editingUser?.hod_profile?.employee_id} 
                      required 
                      type="text" 
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" 
                      placeholder="SECE202401" 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Initial Password'}
                  </label>
                  <input 
                    name="password" 
                    required={!editingUser} 
                    type="password" 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" 
                    placeholder="••••••••" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Assign Role</label>
                    <select
                      name="role"
                      defaultValue={editingUser?.role || 'faculty'}
                      required
                      onChange={e => { setFormRole(e.target.value); setSelectedDeptIds([]); }}
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm"
                    >
                      <option value="faculty">Faculty</option>
                      <option value="hod">HOD</option>
                      <option value="iqac">IQAC</option>
                      <option value="admin">Admin</option>
                      <option value="staff">HR Staff</option>
                    </select>
                  </div>
                  {/* For non-staff: single department dropdown */}
                  {formRole !== 'staff' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Department</label>
                      <select 
                        name="department" 
                        defaultValue={editingUser?.department?.id || editingUser?.department} 
                        required={formRole === 'faculty' || formRole === 'hod'}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm"
                      >
                        <option value="">Select Dept</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{abbrevDept(dept.name)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {/* For staff: multi-select departments */}
                {formRole === 'staff' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Assign Departments <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      {departments.map(dept => (
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedDeptIds.includes(dept.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedDeptIds(prev => [...prev, dept.id]);
                              } else {
                                setSelectedDeptIds(prev => prev.filter(id => id !== dept.id));
                              }
                            }}
                            className="w-3.5 h-3.5 accent-slate-900 rounded"
                          />
                          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
                            {abbrevDept(dept.name)}
                          </span>
                        </label>
                      ))}
                    </div>
                    {selectedDeptIds.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-slate-500 font-medium">
                        {selectedDeptIds.length} department{selectedDeptIds.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
                <button type="submit" disabled={isSaving} className="w-full py-3.5 text-white rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: 'var(--primary-500)' }}
                  onMouseEnter={e => !isSaving && (e.currentTarget.style.background = 'var(--primary-600)')}
                  onMouseLeave={e => !isSaving && (e.currentTarget.style.background = 'var(--primary-500)')}
                >
                  {isSaving
                    ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                    : <><Lock size={16} /> {editingUser ? 'Update Account' : 'Provision Account'}</>
                  }
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
