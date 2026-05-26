import { Link, useLocation } from 'react-router-dom';
import { FileText, Compass, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const links = [
    { path: '/notes', label: 'Notes', icon: FileText, badge: 3 },
    { path: '/explore', label: 'Explore', icon: Compass },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/account', label: 'Profile', icon: User, isAvatar: true },
  ];

  return (
    <>
      {/* Frosted Glass Gaussian Blur container underneath the navbar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[88px] bg-gradient-to-t from-white/80 via-white/40 to-transparent dark:from-black/80 dark:via-black/40 dark:to-transparent backdrop-blur-[12px] pointer-events-none z-40" />

      {/* Floating iOS style Dock Navbar */}
      <nav className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[360px] bg-white/75 dark:bg-black/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[26px] py-2 px-5 z-50 shadow-[0_12px_36px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between">
        <ul className="flex items-center justify-between w-full">
          {links.map((item) => {
            const active = location.pathname.startsWith(item.path) || 
                          (item.path === '/settings' && location.pathname === '/settings') ||
                          (item.isAvatar && location.pathname === '/account');

            const renderAvatar = () => {
              const borderClass = active 
                ? 'ring-2 ring-[#007AFF] ring-offset-2 dark:ring-offset-black scale-105' 
                : 'border border-gray-300/40 hover:border-gray-400 dark:border-white/20';
              if (user?.avatar) {
                return (
                  <img 
                    src={user.avatar} 
                    alt="Profile" 
                    className={`w-[22px] h-[22px] rounded-full object-cover transition-all duration-300 ${borderClass}`} 
                  />
                );
              }
              return (
                <div className={`w-[22px] h-[22px] rounded-full bg-gradient-to-br from-[#0088cc] to-[#00c6ff] flex items-center justify-center text-white text-[9px] font-black transition-all duration-300 ${borderClass}`}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User size={11} className="text-white" />}
                </div>
              );
            };

            const renderIcon = () => {
              if (item.isAvatar) {
                return renderAvatar();
              }
              const Icon = item.icon;
              return (
                <div className="relative flex items-center justify-center">
                  <Icon 
                    size={22} 
                    className={`transition-all duration-300 ${
                      active 
                        ? 'text-[#007AFF] scale-110 fill-[#007AFF]/10' 
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                    }`} 
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 bg-[#FF3B30] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[15px] h-[15px] flex items-center justify-center shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            };

            return (
              <li key={item.label}>
                <Link
                  to={item.path}
                  className="flex flex-col items-center justify-center w-14 h-12 transition-all duration-300 active:opacity-75"
                >
                  {renderIcon()}
                  <span className={`text-[10px] mt-1 font-semibold tracking-wide transition-all duration-300 ${
                    active 
                      ? 'text-[#007AFF] font-bold' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
