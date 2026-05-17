/**
 * SECE CO-PO Platform — App Shell Layout
 * Wraps all authenticated pages with Sidebar + Topbar
 */
import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--surface-secondary)' }}
      >
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--primary-500)' }}
          >
            <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div className="font-semibold" style={{ color: 'var(--gray-600)' }}>Loading SECE CO-PO Portal...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0 z-10"
          style={{
            background: 'var(--surface-primary)',
            borderColor: 'var(--border)',
            minHeight: '64px',
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--gray-400)' }}
                />
                <input
                  type="search"
                  placeholder="Search subjects, students, reports..."
                  className="form-input h-12 text-sm transition-all focus:ring-2 focus:ring-blue-500/20"
                  style={{ 
                    background: 'var(--surface-secondary)', 
                    paddingLeft: '52px',
                    paddingRight: '16px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-light)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 ml-4">
            <div className="relative">
              <button 
                className={`btn btn-ghost p-2.5 rounded-xl transition-all ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                <span
                  className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 border-white"
                  style={{ background: 'var(--danger)' }}
                />
              </button>

              {/* Notification Popover */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 font-display">Notifications</h4>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">3 New</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {[
                        { title: 'Excel Processing Complete', msg: 'CIA1 marks for DS8301 successfully imported.', time: '2 mins ago', color: 'green' },
                        { title: 'Attainment Alert', msg: 'PO1 attainment for ME8401 is below threshold.', time: '1 hour ago', color: 'red' },
                        { title: 'New Student Data', msg: 'Batch 2022 list has been updated by Admin.', time: '3 hours ago', color: 'blue' },
                      ].map((n, i) => (
                        <div key={i} className="p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-${n.color}-500`} />
                            <div>
                              <p className="text-sm font-bold text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.msg}</p>
                              <p className="text-[10px] text-gray-400 mt-2 font-medium">{n.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full p-3 text-center text-xs font-bold text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors">
                      View All Notifications
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto md:pb-0 pb-20">
          <motion.div
            className="page-enter h-full"
            key={location.pathname}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
