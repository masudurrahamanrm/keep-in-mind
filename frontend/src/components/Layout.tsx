import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function Layout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const navigate = useNavigate();
  const showFab = location.pathname === '/tasks' || location.pathname === '/reminders';
  const fabTarget = location.pathname === '/tasks' ? '/tasks/new' : '/reminders/new';

  return (
    <div className="flex h-screen bg-white dark:bg-[#111318] overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {location.pathname !== '/account' && !location.pathname.startsWith('/vault') && location.pathname !== '/gallery' && !location.pathname.startsWith('/reminders') && !location.pathname.startsWith('/tasks') && (
          <TopBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        )}
        <main className={`flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 relative custom-scrollbar overflow-x-hidden ${location.pathname === '/account' || location.pathname === '/gallery' || location.pathname === '/settings' ? '!p-0 !max-w-none' : ''}`}>
          <Outlet context={{ searchQuery }} />
        </main>

        {/* Floating Action Button */}
        {showFab && (
          <button
            onClick={() => navigate(fabTarget)}
            className="fixed bottom-24 right-5 md:bottom-8 md:right-8 w-14 h-14 bg-[#FFC107] hover:bg-[#F5B000] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#FFC107]/40 transition-all active:scale-90 z-50"
          >
            <Plus size={26} strokeWidth={3} />
          </button>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
