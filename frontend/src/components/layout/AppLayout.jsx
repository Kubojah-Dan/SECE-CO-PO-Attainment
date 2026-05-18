/**
 * SECE CO-PO Platform — App Shell Layout
 * Wraps all authenticated pages with Sidebar + Topbar
 */
import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/api';
import Sidebar from './Sidebar';
import { toast } from 'react-toastify';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  const queryClient = useQueryClient();
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
    enabled: !!isAuthenticated,
    refetchInterval: 5000, // Poll every 5 seconds for a fast, responsive live experience
  });

  const notifications = (Array.isArray(notifData) ? notifData : notifData?.data?.results || notifData?.data || []);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (!latest.is_read && latest.id !== lastNotificationId) {
        setLastNotificationId(latest.id);
        const toastType = latest.level === 'success' ? 'success' :
                          latest.level === 'warning' ? 'warning' :
                          latest.level === 'danger' ? 'error' : 'info';
        toast[toastType](
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs">{latest.title}</span>
            <span className="text-[10px] opacity-90">{latest.message}</span>
          </div>,
          { autoClose: 5000, hideProgressBar: false }
        );
      }
    }
  }, [notifications, lastNotificationId]);

  const markReadMutation = useMutation({
    customKey: 'mark-read',
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    customKey: 'mark-all-read',
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

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
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0 z-20"
          style={{
            background: 'var(--surface-primary)',
            borderColor: 'var(--border)',
            minHeight: '64px',
          }}
        >
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-all text-gray-500"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
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
                {unreadCount > 0 && (
                  <span
                    className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full border-2 border-white"
                    style={{ background: 'var(--danger)' }}
                  />
                )}
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 font-display">Notifications</h4>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                            {unreadCount} New
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        title="Close panel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              if (!n.is_read) markReadMutation.mutate(n.id);
                            }}
                            className={`p-4 transition-colors cursor-pointer ${n.is_read ? 'hover:bg-gray-50 bg-white' : 'bg-blue-50/40 hover:bg-blue-50/60'}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                n.level === 'success' ? 'bg-emerald-500' :
                                n.level === 'warning' ? 'bg-amber-500' :
                                n.level === 'danger' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${n.is_read ? 'text-gray-600 font-medium' : 'text-gray-900 font-bold'}`}>{n.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 break-words">{n.message}</p>
                                <p className="text-[9px] text-gray-400 mt-2 font-semibold">
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 text-xs">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={() => markAllReadMutation.mutate()}
                        className="w-full p-3 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 border-t border-gray-50 transition-colors"
                      >
                        Mark All as Read
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            className="page-enter"
            key={location.pathname}
          >
            <Outlet />
            {/* Mobile Nav Spacer */}
            <div className="md:hidden h-32 w-full flex-shrink-0" />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
