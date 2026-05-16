import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, 
  Mail, Phone, Shield, MoreHorizontal,
  Download, Upload, Check, X, Loader2,
  Trash2, Edit2, Lock
} from 'lucide-react';
import Card from '../../components/ui/Card';
import { userService, departmentService } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  const tabs = ['All', 'HOD', 'Faculty', 'Admin', 'IQAC'];

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
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-ui">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight">User Management</h1>
          <p className="text-slate-500 mt-1">Manage institutional roles, permissions and account access</p>
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
                await userService.bulkCreate(file);
                toast.update(toastId, { render: 'Import successful', type: 'success', isLoading: false, autoClose: 3000 });
                fetchUsers();
              } catch (err) {
                toast.update(toastId, { render: 'Import failed', type: 'error', isLoading: false, autoClose: 3000 });
              }
            }}
          />
          <button 
            onClick={() => document.getElementById('bulk-import-input').click()}
            className="flex items-center px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Upload className="w-4 h-4 mr-2 text-blue-500" />
            Bulk Import
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200 w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email or department..."
            className="w-full !pl-16 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden p-0 border-none shadow-2xl bg-white/80 backdrop-blur-md">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Syncing User Directory...</p>
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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-100/50 text-blue-700 border border-blue-200/50">
                          <Shield size={12} className="mr-1.5" />
                          {user.role}
                        </span>
                      </td>
                      <td className="py-6 px-8">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                          {(() => {
                            if (user.role === 'admin') return 'SECE (Admin)';
                            const deptId = user.faculty_profile?.department || user.hod_profile?.department || user.department || user.department_id;
                            const dept = departments.find(d => d.id?.toString() === deptId?.toString());
                            return dept?.short_name || 'N/A';
                          })()}
                        </span>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${user.is_active ? 'text-emerald-700' : 'text-red-700'}`}>
                            {user.is_active ? 'Active' : 'Locked'}
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
                
                // Construct data for nested structures if needed
                // But for DRF with nested writable serializers and files, 
                // we might need to handle it carefully or send as flat and handle in serializer.
                // Actually, our serializer handles faculty_profile and hod_profile.
                
                // Construct payload
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

                // Handle nested profiles in a flat way for simplicity or as JSON
                // The backend UserCreateUpdateSerializer expects faculty_profile/hod_profile as dicts.
                // FormData doesn't support nested objects directly. We'll use a trick or adjust backend.
                // Let's send them as JSON strings if the backend can handle it, 
                // or just send as multiple fields if we use a different approach.
                // Actually, most DRF Multipart parsers handle nested fields like 'faculty_profile.department'
                
                if (rawData.role === 'faculty') {
                  payload.append('faculty_profile.department', rawData.department);
                  payload.append('faculty_profile.employee_id', rawData.employee_id);
                } else if (rawData.role === 'hod') {
                  payload.append('hod_profile.department', rawData.department);
                  payload.append('hod_profile.employee_id', rawData.employee_id);
                }
                
                try {
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
                  toast.error(err.response?.data?.message || 'Failed to process user');
                }
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">First Name</label>
                    <input name="first_name" defaultValue={editingUser?.first_name} required type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm" placeholder="John" />
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
                    <select name="role" defaultValue={editingUser?.role || 'faculty'} required className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm">
                      <option value="faculty">Faculty</option>
                      <option value="hod">HOD</option>
                      <option value="iqac">IQAC</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Department</label>
                    <select 
                      name="department" 
                      defaultValue={editingUser?.department?.id || editingUser?.department} 
                      required 
                      className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-sm"
                    >
                      <option value="">Select Dept</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold mt-4 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                  <Lock size={16} />
                  {editingUser ? 'Update Account' : 'Provision Account'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
