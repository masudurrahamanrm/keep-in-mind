import { Search, Bell, Settings, User, Menu, X, ArrowLeft, FileText, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NotificationPanel from './NotificationPanel';
import { Notification } from './NotificationItem';
import { clsx } from 'clsx';

interface TopBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export default function TopBar({ searchQuery, setSearchQuery, onToggleSidebar, onOpenMobileMenu }: TopBarProps) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Define sub-pages that need a back button and specific title
  const PAGE_TITLES: Record<string, string> = {
    '/settings': 'Settings',
    '/account': 'Profile',
    '/drawing': 'Sketch',
    '/gallery': 'Media Gallery',
    '/explore': 'Explore',
    '/labels': 'Labels',
    '/recent': 'Recent',
    '/archive': 'Archive'
  };

  const currentPath = location.pathname;
  const pageTitle = PAGE_TITLES[currentPath] || Object.keys(PAGE_TITLES).find(p => currentPath.startsWith(p) && p !== '/') ? PAGE_TITLES[Object.keys(PAGE_TITLES).find(p => currentPath.startsWith(p) && p !== '/')!] : '';
  const isSettingsOrAccount = currentPath === '/settings' || currentPath === '/account';
  const canGoBack = currentPath === '/settings' || (currentPath.startsWith('/drawing') && currentPath !== '/drawing');

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Fetch Notifications Error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleRead = async (id: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleReadAll = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mobile Search Overlay
  if (isMobileSearchOpen) {
    return (
      <header className="h-16 flex items-center gap-3 px-3 glass z-10 sticky top-0">
        <button
          onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(''); }}
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={18} />
          </div>
          <input
            type="text"
            autoFocus
            className="block w-full pl-10 pr-3 py-2.5 rounded-full bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
            placeholder="Search notes, labels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        )}
      </header>
    );
  }

  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-4 md:px-6 glass z-50 sticky top-0 gap-2 !bg-surface/80 backdrop-blur-2xl border-b border-white/5">
      {/* Left: Hamburger (mobile) / Back Button / Logo (Desktop) */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 w-10 sm:w-48 lg:w-64">
        {canGoBack ? (
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all min-w-[40px] min-h-[40px] flex items-center justify-center -ml-1"
            title="Go Back"
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <>
            {/* Mobile hamburger */}
            <button
              onClick={onOpenMobileMenu}
              className="p-2 text-on-surface hover:bg-surface-container-high rounded-full transition-all md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Open Menu"
            >
              <Menu size={22} />
            </button>
            {/* Desktop sidebar toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2 text-on-surface hover:bg-surface-container-high rounded-full transition-all hover:rotate-90 hidden md:flex items-center justify-center min-w-[44px] min-h-[44px]"
              title="Toggle Sidebar"
            >
              <Menu size={22} />
            </button>
          </>
        )}

      </div>

      {/* Center: Title (mobile) or Search bar (tablet+) */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {pageTitle && (currentPath === '/settings' || currentPath.startsWith('/drawing')) ? (
           <span className="md:hidden text-lg font-heading font-bold text-on-surface truncate px-2">{pageTitle}</span>
        ) : (
           <span className="md:hidden text-lg font-black tracking-tighter text-[#1A1F2C] dark:text-[#FFFDF5]">
             KeepIn<span className="text-[#FFC107]">Mind</span>
           </span>
        )}

        <div className={clsx(
          "w-full max-w-2xl hidden sm:block",
          (currentPath === '/settings' || currentPath.startsWith('/drawing')) && "sm:hidden md:block"
        )}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <Search size={18} />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 rounded-full bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface transition-all text-sm"
              placeholder="Search notes, labels, spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0 w-10 sm:w-48 lg:w-64">
        {/* Mobile search icon - Hide on deep pages */}
        {!canGoBack && (
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="sm:hidden p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Search size={22} />
          </button>
        )}

        {/* Add + button on Tasks and Reminders pages */}
        {(currentPath === '/tasks' || currentPath === '/reminders') && (
          <button
            onClick={() => navigate(currentPath === '/tasks' ? '/tasks/new' : '/reminders/new')}
            className="p-2 bg-[#FFC107] hover:bg-[#F5B000] text-white rounded-full transition-all min-w-[36px] min-h-[36px] flex items-center justify-center shadow-md shadow-[#FFC107]/30 active:scale-95"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        )}

        {/* Notifications */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className={clsx(
              "p-2 rounded-full transition-all relative group min-w-[40px] min-h-[40px] flex items-center justify-center",
              isNotificationOpen ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:bg-surface-container-high"
            )}
          >
            <Bell size={22} className={clsx(unreadCount > 0 && "animate-wiggle")} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full block border-2 border-surface animate-pulse" />
            )}
          </button>
          <NotificationPanel
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            notifications={notifications}
            onRead={handleRead}
            onReadAll={handleReadAll}
            onDelete={handleDelete}
            onClearAll={handleClearAll}
            loading={loading}
          />
        </div>

        {/* Settings (hidden on mobile) */}
        {!isSettingsOrAccount && (
          <button
            onClick={() => navigate('/settings')}
            className="hidden sm:flex p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors min-w-[44px] min-h-[44px] items-center justify-center"
          >
            <Settings size={22} />
          </button>
        )}

        {/* Avatar */}
        <button
          onClick={() => navigate('/account')}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold overflow-hidden border-2 border-surface shadow-sm shrink-0 hover:ring-2 hover:ring-primary/40 transition-all hidden sm:flex"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name ?? 'Profile'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={18} />
          )}
        </button>
      </div>
    </header>
  );
}
