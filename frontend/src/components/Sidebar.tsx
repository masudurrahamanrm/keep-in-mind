import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Compass, Clock, Image as ImageIcon, Users, Activity, Settings, User, X, LogOut, ChevronRight, Power } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      signOut();
      onMobileClose?.();
      navigate('/auth');
    }, 1200); // Wait 1.2s for the full screen animation
  };

  const links = [
    { path: '/notes',   label: 'Notes',   icon: FileText },
    { path: '/explore', label: 'Explore', icon: Compass  },
    { path: '/recent',  label: 'Recent',  icon: Clock    },
  ];

  const spaces = [
    { path: '/gallery', label: 'Personal', icon: ImageIcon },
    { path: '/labels',  label: 'Labels',   icon: Users    },
    { path: '/archive', label: 'Archive',  icon: Activity },
    { path: '/settings', label: 'Settings', icon: Settings },
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
          <div className="mt-2 px-1">
            <button
              onClick={() => { signOut(); onMobileClose?.(); navigate('/auth'); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-error/10 border border-error/20 hover:bg-error/20 transition-colors text-error group shadow-sm"
            >
              <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold tracking-tight">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
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
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img src="/logo.jpg" alt="KeepInMind Logo" className="w-full h-full object-contain mix-blend-multiply scale-95 drop-shadow-sm rounded-2xl" />
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
        "fixed inset-y-0 left-0 z-[60] w-[320px] max-w-[85vw] flex flex-col bg-surface overflow-hidden transition-transform duration-300 ease-in-out md:hidden shadow-2xl",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Top Wave */}
        <svg className="absolute top-0 left-0 w-full text-primary/10 pointer-events-none" viewBox="0 0 1440 320" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,64L48,85.3C96,107,192,149,288,144C384,139,480,85,576,64C672,43,768,53,864,80C960,107,1056,149,1152,144C1248,139,1344,85,1392,58.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
        
        {/* Bottom Wave */}
        <svg className="absolute bottom-0 left-0 w-full text-primary pointer-events-none" viewBox="0 0 1440 320" fill="currentColor" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ height: '120px' }}>
          <path d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,144C672,149,768,203,864,224C960,245,1056,235,1152,197.3C1248,160,1344,96,1392,64L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>



        <div className="relative z-10 flex-1 flex flex-col pt-12 px-6 overflow-y-auto no-scrollbar pb-6">
          {/* Logo area */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 flex items-center justify-center shrink-0">
              <img src="/logo.jpg" alt="KeepInMind Logo" className="w-full h-full object-contain mix-blend-multiply scale-95 drop-shadow-md hover:scale-100 transition-transform rounded-2xl" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-on-surface">
                Keep<span className="text-primary">InMind</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-on-surface-variant font-medium">Capture. Organize. Remember.</span>
            </div>
          </div>

          {/* MAIN */}
          <div className="mb-6">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mb-2 px-2">Main</h3>
            <ul className="space-y-1">
              {links.map((item) => {
                const active = location.pathname.startsWith(item.path) || (item.path === '/notes' && location.pathname.startsWith('/drawing'));
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link to={item.path} onClick={onMobileClose} className={cn("flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all", active ? "bg-primary/10 text-primary shadow-sm" : "text-on-surface hover:bg-surface-container")}>
                      <Icon size={18} className={cn(active ? "text-primary" : "text-on-surface-variant")} />
                      <span className="flex-1 text-sm tracking-tight">{item.label}</span>
                      <ChevronRight size={16} className={cn(active ? "text-primary" : "text-on-surface-variant")} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* SPACES */}
          <div className="mb-6">
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mb-2 px-2">Spaces</h3>
            <ul className="space-y-1">
              {spaces.map((item) => {
                const active = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link to={item.path} onClick={onMobileClose} className={cn("flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all", active ? "bg-primary/10 text-primary shadow-sm" : "text-on-surface hover:bg-surface-container")}>
                      <Icon size={18} className={cn(active ? "text-primary" : "text-on-surface-variant")} />
                      <span className="flex-1 text-sm tracking-tight">{item.label}</span>
                      <ChevronRight size={16} className={cn(active ? "text-primary" : "text-on-surface-variant")} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>


          {/* Bottom Actions */}
          <div className="mt-auto mb-6 flex justify-center w-full relative z-10 perspective-[1000px]">
            <motion.button 
              onClick={handleLogout}
              animate={isLoggingOut ? { scale: 0.9, opacity: 0 } : {}}
              transition={{ duration: 0.3 }}
              className="w-1/2 flex items-center justify-center gap-2 py-3 bg-error/10 backdrop-blur-md rounded-2xl text-error font-bold text-sm shadow-lg shadow-error/10 hover:bg-error/20 border border-error/10 active:scale-95 transition-all"
            >
               <Power size={16} /> Logout
            </motion.button>
          </div>
        </div>
      </div>

      {/* Full Screen Logout Animation */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0, rotateX: -90, z: -1000 }}
            animate={{ opacity: 1, rotateX: 0, z: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center flex-col"
            style={{ perspective: 1000 }}
          >
            <motion.div
              animate={{ rotateY: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="text-error mb-4"
            >
              <Power size={80} />
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-white text-3xl font-black tracking-widest uppercase"
            >
              Logging out...
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
