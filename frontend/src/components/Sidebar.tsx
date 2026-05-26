import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Compass, Clock, Image as ImageIcon, Users, Activity, Settings, User, X, LogOut, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isCollapsed, isMobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const links = [
    { path: '/notes',   label: 'Notes',   icon: FileText },
    { path: '/explore', label: 'Explore', icon: Compass  },
    { path: '/recent',  label: 'Recent',  icon: Clock    },
  ];

  const spaces = [
    { path: '/gallery', label: 'Personal', icon: ImageIcon },
    { path: '/labels',  label: 'Labels',   icon: Users    },
    { path: '/archive', label: 'Archive',  icon: Activity },
  ];

  const renderLinks = (items: { path: string; label: string; icon: any }[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const isNotes = item.path === '/notes';
        const active = location.pathname.startsWith(item.path) || (isNotes && location.pathname.startsWith('/drawing'));
        const Icon = item.icon;
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold transition-all duration-300 min-h-[44px] group relative overflow-hidden',
                active
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-on-surface hover:bg-surface-container-high/80 active:scale-[0.98]',
                isCollapsed ? 'justify-center px-2' : ''
              )}
              title={isCollapsed ? item.label : ''}
            >
              {active && <motion.div layoutId="sidebar-active" className="absolute inset-0 bg-primary -z-10" />}
              <Icon 
                size={20} 
                className={cn(
                  'shrink-0 transition-transform duration-300 group-hover:scale-110', 
                  active ? 'text-white' : 'text-on-surface/60 group-hover:text-primary transition-colors'
                )} 
              />
              {!isCollapsed && <span className="truncate text-sm tracking-tight font-bold">{item.label}</span>}
              {active && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/40" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const UserSection = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("mt-auto pt-6 border-t border-outline-variant/20", mobile ? "px-1 pb-[72px]" : "pb-2")}>
      <div className={cn(
        "flex flex-col gap-2",
        isCollapsed && !mobile ? "items-center" : ""
      )}>
        {/* User Profile Summary */}
        <div 
          onClick={() => { navigate('/account'); onMobileClose?.(); }}
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer hover:bg-surface-container-high transition-colors group",
            isCollapsed && !mobile ? "justify-center" : ""
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary overflow-hidden shrink-0 border-2 border-white/5 group-hover:border-primary/30 transition-all flex items-center justify-center">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-white" />
            )}
          </div>
          {!isCollapsed || mobile ? (
            <div className="flex-1 min-w-0 text-left">
              <h4 className="text-sm font-black text-on-surface truncate tracking-tight">{user?.name || 'Guest User'}</h4>
              <p className="text-[10px] font-black text-on-surface opacity-60 uppercase tracking-widest truncate">{user?.authProvider || 'Local'} Account</p>
            </div>
          ) : null}
          {!isCollapsed || mobile ? <ChevronRight size={14} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" /> : null}
        </div>

        {/* Action Buttons */}
        {!isCollapsed || mobile ? (
          <div className="grid grid-cols-2 gap-2 mt-2 px-1">
            <button
              onClick={() => { navigate('/settings'); onMobileClose?.(); }}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/20 hover:bg-surface-container-highest transition-colors text-on-surface hover:text-primary group shadow-sm"
            >
              <Settings size={16} className="group-hover:rotate-45 transition-transform" />
              <span className="text-xs font-bold tracking-tight">Settings</span>
            </button>
            <button
              onClick={() => { signOut(); onMobileClose?.(); navigate('/auth'); }}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error/10 border border-error/20 hover:bg-error/20 transition-colors text-error group shadow-sm"
            >
              <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold tracking-tight">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
             <button
              onClick={() => { navigate('/settings'); }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-all"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={() => { signOut(); navigate('/auth'); }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-error/5 hover:bg-error/10 text-error transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* --- Desktop Sidebar (md+) --- */}
      <aside className={cn(
        "hidden md:flex flex-col glass h-full border-r border-outline-variant/20 py-5 px-3 overflow-y-hidden z-20 transition-all duration-300 ease-in-out shrink-0",
        isCollapsed ? "w-[80px]" : "w-64 lg:w-72"
      )}>
        {/* Logo */}
        <div className={cn(
          "mb-10 flex items-center gap-3 transition-all duration-300",
          isCollapsed ? "justify-center" : "ml-2"
        )}>
          <div className="w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center shrink-0 shadow-xl shadow-primary/30">
            <FileText size={20} />
          </div>
          {!isCollapsed && (
            <span className="truncate text-lg font-black tracking-tighter">
              Keep <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">In Mind</span>
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
          <div>
            {!isCollapsed && <h3 className="px-4 text-[10px] font-black text-on-surface uppercase tracking-[0.2em] mb-3 opacity-80">Main Menu</h3>}
            {renderLinks(links)}
          </div>

          <div>
            {!isCollapsed && <h3 className="px-4 text-[10px] font-black text-on-surface uppercase tracking-[0.2em] mb-3 opacity-80">Spaces</h3>}
            {renderLinks(spaces)}
          </div>
        </div>

        <UserSection />
      </aside>

      {/* --- Mobile Drawer (< md) --- */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[60] w-72 flex flex-col glass border-r border-outline-variant/20 py-5 px-4 overflow-y-hidden transition-transform duration-300 ease-in-out md:hidden shadow-2xl",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between mb-10 ml-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-xl shadow-primary/30">
              <FileText size={20} />
            </div>
            <span className="text-lg font-black tracking-tighter">
              Keep <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">In Mind</span>
            </span>
          </div>
          <button
            onClick={onMobileClose}
            className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
          <div>
            <h3 className="px-4 text-[10px] font-black text-on-surface uppercase tracking-[0.2em] mb-3 opacity-80">Main Menu</h3>
            {renderLinks(links)}
          </div>

          <div>
            <h3 className="px-4 text-[10px] font-black text-on-surface uppercase tracking-[0.2em] mb-3 opacity-80">Spaces</h3>
            {renderLinks(spaces)}
          </div>
        </div>

        <UserSection mobile />
      </div>
    </>
  );
}
