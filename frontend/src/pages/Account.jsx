import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronRight, Edit2, Crown, BarChart2, Star, Archive, HelpCircle, Info, Trash2, Cloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const navigate = useNavigate();
  const { user, signOut, googleAccessToken } = useAuth();

  const profileKey = user ? `keep-in-mind-profile-${user._id}` : 'keep-in-mind-profile-guest';

  const [localOverrides, setLocalOverrides] = useState(() => {
    const saved = localStorage.getItem(profileKey);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed.avatar && typeof parsed.avatar === 'string' && parsed.avatar.startsWith('blob:')) {
      delete parsed.avatar;
    }
    return parsed;
  });

  useEffect(() => {
    const saved = localStorage.getItem(profileKey);
    setLocalOverrides(saved ? JSON.parse(saved) : {});
  }, [profileKey]);

  const profile = {
    name:   localOverrides.name   || user?.name  || 'Guest User',
    email:  user?.email           || 'Not signed in',
    avatar: localOverrides.avatar || user?.avatar || null,
  };

  const initials = profile.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const menuGroup1 = [
    { icon: BarChart2, label: 'My Stats',  color: '#FF9E4A', path: null },
    { icon: Star,      label: 'Favorites', color: '#FDCB58', path: null },
    { icon: Trash2,    label: 'Trash',     color: '#F87171', path: '/trash' },
    { icon: Archive,   label: 'Archived',  color: '#FF9E4A', path: '/archive' },
  ];

  const menuGroup2 = [
    { icon: HelpCircle, label: 'Help & Support',     color: '#FF9E4A', path: '/help' },
    { icon: Info,       label: 'About KeepInMind',   color: '#FDCB58', path: '/about' },
  ];

  return (
    <div className="min-h-full flex flex-col bg-[#FFF9ED] dark:bg-neutral-900 pb-24 overflow-y-auto">

      {/* ── Gradient Header ─────────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center px-6 pt-14 pb-10 rounded-b-[40px] shadow-sm"
        style={{ background: 'linear-gradient(135deg, #FFE8B6 0%, #FFD682 50%, #FFC14A 100%)' }}
      >
        {/* Decorative stars */}
        <span className="absolute top-20 left-10 text-white/40 text-xl select-none">✦</span>
        <span className="absolute top-8 right-12 text-white/50 text-2xl select-none">✦</span>
        <span className="absolute bottom-16 left-16 text-white/30 text-lg select-none">✦</span>
        <span className="absolute top-12 right-24 text-white/30 text-sm select-none">✦</span>

        {/* Edit button */}
        <button
          className="absolute top-14 right-6 text-neutral-700 hover:text-[#FF9E4A] transition-colors"
          onClick={() => {}}
        >
          <Edit2 size={18} />
        </button>

        {/* Avatar */}
        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center mb-4">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-[#FF9E4A]">{initials}</span>
          )}
        </div>

        {/* Name & Email */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-1">{profile.name}</h1>
        <p className="text-sm text-neutral-600">{profile.email}</p>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="px-5 pt-6 space-y-5">

        {/* Storage Card */}
        <div 
          className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-white/50 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
          onClick={() => navigate('/cloud-sync')}
        >
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${googleAccessToken ? 'bg-green-50 dark:bg-green-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
              <Cloud size={22} className={googleAccessToken ? 'text-green-500' : 'text-blue-500'} />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-800 dark:text-neutral-100 text-[15px] mb-0.5">Google Drive Sync</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-[13px] mb-3 leading-snug">
                {googleAccessToken ? 'Connected — Tap to manage backup' : 'Connect to back up your notes'}
              </p>
              <button 
                className={`text-white text-xs font-semibold py-1.5 px-4 rounded-full transition-colors shadow-sm ${
                  googleAccessToken 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/cloud-sync');
                }}
              >
                {googleAccessToken ? 'Manage Backup' : 'Connect Drive'}
              </button>
            </div>
          </div>
          <ChevronRight size={18} className="text-neutral-400 shrink-0" />
        </div>

        {/* Group 1: Stats / Favorites / Trash / Archived */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
          {menuGroup1.map((item, idx) => (
            <React.Fragment key={item.label}>
              <button
                onClick={() => item.path ? navigate(item.path) : null}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}22` }}
                  >
                    <item.icon size={16} color={item.color} strokeWidth={2} />
                  </div>
                  <span className="text-[15px] font-medium text-neutral-800 dark:text-neutral-100">{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-500" />
              </button>
              {idx < menuGroup1.length - 1 && (
                <div className="h-px bg-neutral-100 dark:bg-neutral-700 ml-16" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Group 2: Help & About */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
          {menuGroup2.map((item, idx) => (
            <React.Fragment key={item.label}>
              <button
                onClick={() => item.path ? navigate(item.path) : null}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}22` }}
                  >
                    <item.icon size={16} color={item.color} strokeWidth={2} />
                  </div>
                  <span className="text-[15px] font-medium text-neutral-800 dark:text-neutral-100">{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-500" />
              </button>
              {idx < menuGroup2.length - 1 && (
                <div className="h-px bg-neutral-100 dark:bg-neutral-700 ml-16" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-100 dark:border-red-900/40 bg-white dark:bg-neutral-800 text-red-500 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shadow-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>

      </div>
    </div>
  );
}
