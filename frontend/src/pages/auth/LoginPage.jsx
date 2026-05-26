/**
 * SECE CO-PO Platform — Premium Login Page
 * Split-screen design: campus photo left, form right
 * Role selector tabs: Admin | HOD | Faculty | IQAC
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, Lock, Mail, ChevronRight, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import campusHero from '../../assets/image2.png';
import logo from '../../assets/logo.png';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const ROLES = [
  { id: 'admin', label: 'Super Admin', description: 'Full platform access' },
  { id: 'hod', label: 'HOD', description: 'Department management' },
  { id: 'faculty', label: 'Faculty', description: 'Subject & marks management' },
  { id: 'iqac', label: 'IQAC', description: 'Analytics & accreditation' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, logout } = useAuth();
  const [selectedRole, setSelectedRole] = useState('faculty');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const user = await login(data.email, data.password);

      // Enforce selected role matches actual role
      if (user.role !== selectedRole) {
        await logout();
        throw new Error(`Your account is registered as ${user.role.toUpperCase()}, but you selected ${selectedRole.toUpperCase()}. Please select the correct role.`);
      }

      const routes = {
        admin: '/admin/dashboard',
        hod: '/hod/dashboard',
        faculty: '/faculty/dashboard',
        iqac: '/iqac/dashboard',
      };
      navigate(routes[user.role] || '/faculty/dashboard', { replace: true });
    } catch (err) {
      setAuthError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex font-ui overflow-hidden">
      {/* ── Left: Campus Photo ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={campusHero}
          alt="Sri Eshwar College of Engineering Campus"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        {/* Gradient overlay */}
        <div
          style={{ background: 'linear-gradient(145deg, var(--primary-900) 0%, var(--primary-700) 60%, var(--primary-600) 100%)', position: 'absolute', inset: 0 }}
        />
        {/* Content over photo */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full text-white">
          {/* Logo & Name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white p-1.5 rounded-2xl shadow-lg">
              <img src={logo} alt="SECE Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display tracking-tight leading-none">SECE</h1>
              <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mt-1">CO-PO/PSO Attainment Portal</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="max-w-md">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-6xl font-bold font-display leading-[1.1] mb-6"
            >
              Excellence <br />
              <span className="text-amber-400">Simplified.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-lg text-blue-100 font-medium leading-relaxed opacity-90"
            >
              The unified platform for Sri Eshwar's academic analytics,
              CO-PO attainment, and institutional intelligence.
            </motion.p>
          </div>

          {/* Footer Info */}
          <div className="text-xs text-blue-300/80 font-bold tracking-widest uppercase">
            Sri Eshwar College of Engineering — Autonomous Institution
          </div>
        </div>
      </div>

      {/* ── Right: Login Form ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="min-h-full flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-md"
          >
            {/* Institutional Heading */}
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">Institutional Login</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium mt-2">Access your department analytics and tracking tools</p>
            </div>

            {/* Role Selector */}
            <div className="mb-10">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 mb-4 block">Choose Access Level</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group ${
                      selectedRole === role.id
                        ? 'border-[var(--primary-500)] bg-[var(--primary-50)] shadow-md shadow-[var(--primary-500)]/10'
                        : 'border-[var(--border)] bg-white hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className={`font-semibold text-sm ${selectedRole === role.id ? 'text-[var(--primary-600)]' : 'text-[var(--text-primary)]'}`}>
                      {role.label}
                    </div>
                    <div className={`text-[10px] mt-1 font-medium uppercase tracking-tight ${selectedRole === role.id ? 'text-[var(--primary-400)]' : 'text-[var(--text-muted)]'}`}>
                      {role.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Academic Email</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
                    <Mail size={18} className="text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@sece.ac.in"
                    className="w-full h-14 pl-14 pr-4 bg-white border border-[var(--border-strong)] rounded-2xl focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-100)] outline-none transition-all font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 z-10">
                    <Lock size={18} className="text-slate-400 transition-colors group-focus-within:text-blue-600" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full h-14 pl-14 pr-14 bg-white border border-[var(--border-strong)] rounded-2xl focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-100)] outline-none transition-all font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} className="text-slate-400" /> : <Eye size={18} className="text-slate-400" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle size={14} /> {errors.password.message}
                  </p>
                )}
              </div>

              <AnimatePresence>
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3"
                  >
                    <AlertCircle size={18} className="flex-shrink-0" />
                    {authError}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--primary-500)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-600)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--primary-500)'}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In <ChevronRight size={20} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-slate-400 text-xs font-medium">
                Forgot password? Contact <span className="text-blue-600 font-bold cursor-pointer hover:underline">Academic Cell</span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
