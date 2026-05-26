/**
 * SECE CO-PO Platform — Premium User Profile Page
 */
import React, { useState, useRef } from 'react';
import { 
  User, Mail, Shield, Camera, Lock, Save, 
  Building2, Calendar, Phone, Activity,
  ChevronRight, Loader2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { authService } from '../services/api';

export default function Profile() {
  const { user, role, updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Sync preview image with user photo from context
  React.useEffect(() => {
    if (user?.profile_photo) {
      setPreviewImage(user.profile_photo);
    }
  }, [user?.profile_photo]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData(e.target);
      
      if (selectedFile) {
        formData.set('profile_photo', selectedFile);
      } else {
        formData.delete('profile_photo');
      }
      
      if (!showPasswordFields) {
        formData.delete('password');
      }
      
      const response = await authService.updateMe(formData);
      updateUser(response.data);
      toast.success('Profile updated successfully');
      setShowPasswordFields(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                     (err.response?.data && typeof err.response.data === 'object' 
                        ? Object.values(err.response.data).flat()[0] 
                        : 'Failed to update profile');
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const ROLE_COLORS = {
    admin: 'from-red-500 to-red-600',
    hod: 'from-purple-500 to-purple-600',
    faculty: 'from-emerald-500 to-emerald-600',
    iqac: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-10 text-white shadow-xl" style={{ background: 'linear-gradient(135deg, var(--primary-800) 0%, var(--primary-600) 100%)' }}>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Avatar Section */}
          <div className="relative group">
            <div 
              className="w-32 h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center overflow-hidden cursor-pointer group"
              onClick={handleImageClick}
            >
              {previewImage ? (
                <img src={previewImage} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <User size={60} className="text-white/80" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-white/70 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">
              <Shield size={14} /> {role} Access Level
            </div>
            <h1 className="text-4xl font-bold font-display tracking-tight leading-tight">
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-white/80 mt-2 font-medium flex items-center justify-center md:justify-start gap-2">
              <Mail size={16} /> {user?.email}
            </p>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity size={120} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card className="p-10 border-none shadow-2xl bg-white/80 backdrop-blur-md">
            <h3 className="text-xl font-bold text-slate-900 font-display mb-8">Personal Information</h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    type="text" 
                    name="first_name"
                    defaultValue={user?.first_name}
                    className="w-full p-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] outline-none transition-all font-medium text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    type="text" 
                    name="last_name"
                    defaultValue={user?.last_name}
                    className="w-full p-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--primary-100)] focus:border-[var(--primary-500)] outline-none transition-all font-medium text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Department</label>
                <div className="relative group">
                  <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    disabled
                    value={user?.department_name || 'Sri Eshwar Institutional'}
                    className="w-full p-4 pl-12 bg-slate-100 border border-slate-100 rounded-2xl text-slate-500 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50">
                <h3 className="text-xl font-bold text-slate-900 font-display mb-6">Security Settings</h3>
                <div className="space-y-4">
                  {!showPasswordFields ? (
                    <button 
                      type="button" 
                      onClick={() => setShowPasswordFields(true)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Lock size={16} className="text-blue-600" /></div>
                        <span className="text-sm font-bold text-slate-700">Change Account Password</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                        <input 
                          type="password" 
                          name="password"
                          placeholder="••••••••"
                          required
                          className="w-full p-4 bg-slate-50 border border-blue-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800"
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowPasswordFields(false)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 ml-1"
                      >
                        Cancel Password Change
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit"
                  disabled={isSaving}
                  variant="secondary"
                  icon={isSaving ? Loader2 : Save}
                  className="px-10 py-4 shadow-xl shadow-blue-600/20"
                >
                  {isSaving ? 'Saving Changes...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="p-8 border-none shadow-2xl bg-white overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-slate-900 font-display mb-4">Account Metadata</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20} /></div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Account Active</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Institutional Access Verified</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute right-[-20px] top-[-20px] text-slate-50 pointer-events-none -rotate-12">
              <Calendar size={140} />
            </div>
          </Card>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Quick Note</h4>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
              If you need to change your registered email or department, please contact the institutional administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
