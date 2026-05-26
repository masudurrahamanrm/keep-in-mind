import React, { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Trash2, ChevronRight, Edit2, Crown, BarChart2, Star, Archive, HelpCircle, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileCard from '../components/profile/ProfileCard';
import EditProfileModal from '../components/profile/EditProfileModal';
import { SectionCard, SettingRow, Toggle, Button } from '../components/settings/SettingsUI';
import { useAuth } from '../context/AuthContext';
import DriveStorageCard from '../components/DriveStorageCard';
import TwoFactorModal from '../components/profile/TwoFactorModal';

export default function Account() {
  const navigate = useNavigate();
  const { user, token, signOut, updateUser } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  // Storage key unique to user
  const profileKey = user ? `keep-in-mind-profile-${user._id}` : 'keep-in-mind-profile-guest';

  const [localOverrides, setLocalOverrides] = useState(() => {
    const saved = localStorage.getItem(profileKey);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // Safety check: remove broken blob URLs that cannot be loaded after a page refresh
    if (parsed.avatar && typeof parsed.avatar === 'string' && parsed.avatar.startsWith('blob:')) {
      delete parsed.avatar;
    }
    return parsed;
  });

  // Re-fetch overrides if user changes (e.g. login/switch account)
  useEffect(() => {
    const saved = localStorage.getItem(profileKey);
    setLocalOverrides(saved ? JSON.parse(saved) : {});
  }, [profileKey]);

  // Build a profile object merging live backend user and local overrides
  const profile = {
    name:   localOverrides.name   || user?.name  || 'Guest User',
    email:  user?.email           || 'Not signed in', // Emails are strict to auth
    phone:  localOverrides.phone  || '',
    bio:    localOverrides.bio    || '',
    avatar: localOverrides.avatar || user?.avatar     || null,
    isGoogle: user?.authProvider === 'google',
  };

  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
  });
  const [twoFactorModal, setTwoFactorModal] = useState(null); // 'setup' | 'disable' | null

  // Load real 2FA status from backend
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/2fa/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setSecurity(prev => ({ ...prev, twoFactor: data.twoFactorEnabled ?? false })))
      .catch(() => {});
  }, [token]);

  const handle2FAToggle = () => {
    if (security.twoFactor) {
      setTwoFactorModal('disable');
    } else {
      setTwoFactorModal('setup');
    }
  };

  const on2FASuccess = (enabled) => {
    setSecurity(prev => ({ ...prev, twoFactor: enabled }));
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Load real notes for activity stats
  const notes = useMemo(() => {
    const saved = localStorage.getItem(`keep-in-mind-notes-${user?._id || 'guest'}`);
    return saved ? JSON.parse(saved) : [];
  }, [user]);
  
  const stats = {
    total: notes.length,
    activeToday: notes.filter(n => {
      try {
        const d = parseISO(n.date);
        return d.toDateString() === new Date().toDateString();
      } catch { return false; }
    }).length
  };
  
  const recentActivity = notes
    .sort((a, b) => {
      try {
        return parseISO(b.date).getTime() - parseISO(a.date).getTime();
      } catch { return 0; }
    })
    .slice(0, 3)
    .map(n => ({
      id: n.id,
      title: n.title,
      time: (() => {
        try {
          const d = parseISO(n.date);
          if (isNaN(d.getTime())) return n.date;
          return formatDistanceToNow(d, { addSuffix: true });
        } catch { return n.date; }
      })(),
      color: n.textColor || 'text-primary'
    }));

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="w-full min-h-screen bg-[#FFF9EA] pb-28 relative font-sans overflow-x-hidden">
      {/* Background Gradient & Shapes */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#FFD54F]/60 to-[#FFF9EA] z-0 pointer-events-none" />
      <div className="absolute top-16 left-8 w-8 h-8 bg-yellow-400 rounded-full blur-[2px] opacity-40 mix-blend-overlay z-0" />
      <div className="absolute top-24 right-12 w-12 h-12 bg-yellow-300 rounded-full blur-[3px] opacity-50 mix-blend-overlay z-0" />
      <div className="absolute top-48 left-[-20px] w-16 h-16 bg-yellow-500 rounded-full blur-[4px] opacity-20 z-0" />
      <div className="absolute top-64 right-6 w-10 h-10 bg-yellow-200 rounded-full blur-[2px] opacity-30 z-0" />

      <div className="max-w-xl mx-auto px-5 pt-8 relative z-10 flex flex-col items-center">
        
        {/* Header Actions */}
        <div className="w-full flex justify-between items-center mb-2">
          <button 
            onClick={() => navigate('/notes')}
            className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors backdrop-blur-sm"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors backdrop-blur-sm"
          >
            <Edit2 size={20} className="text-gray-700" />
          </button>
        </div>

        {/* Profile Avatar */}
        <div className="relative mb-4">
          <div className="w-[120px] h-[120px] rounded-full p-1 bg-white shadow-lg shadow-yellow-500/20">
            {profile.avatar ? (
              <img src={profile.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-4xl text-white font-bold">
                {profile.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Name & Email */}
        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1 text-center">
          {profile.name}
        </h1>
        <p className="text-sm font-medium text-gray-600 text-center mb-8">
          {profile.email}
        </p>

        {/* Premium Banner */}
        <div className="w-full bg-white rounded-[24px] p-5 shadow-sm border border-gray-100 flex items-center justify-between mb-8 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF9EA] flex items-center justify-center shrink-0">
              <Crown className="text-[#FFC107] fill-[#FFC107]" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-[15px] flex items-center gap-1">
                KeepInMind Premium <ChevronRight size={16} className="text-gray-400" />
              </h3>
              <p className="text-sm font-medium text-gray-500">Unlock all premium features</p>
            </div>
          </div>
          <button className="bg-[#FFC107] hover:bg-[#F5B000] text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-sm transition-colors shrink-0">
            Go Premium
          </button>
        </div>

        {/* Nav List 1 */}
        <div className="w-full bg-[#FFFdf8] rounded-[24px] overflow-hidden shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between p-4 px-5 border-b border-gray-100/60 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <BarChart2 size={22} className="text-[#FFC107]" strokeWidth={2.5} />
              <span className="font-bold text-gray-800">My Stats</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-4 px-5 border-b border-gray-100/60 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <Star size={22} className="text-[#FFC107]" strokeWidth={2.5} />
              <span className="font-bold text-gray-800">Favorites</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-4 px-5 border-b border-gray-100/60 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <Trash2 size={22} className="text-[#FFC107]" strokeWidth={2.5} />
              <span className="font-bold text-gray-800">Trash</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-4 px-5 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <Archive size={22} className="text-[#FFC107]" strokeWidth={2.5} />
              <span className="font-bold text-gray-800">Archived</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>

        {/* Nav List 2 */}
        <div className="w-full bg-[#FFFdf8] rounded-[24px] overflow-hidden shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-4 px-5 border-b border-gray-100/60 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <HelpCircle size={22} className="text-[#FFC107]" strokeWidth={2.5} />
              <span className="font-bold text-gray-800">Help & Support</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between p-4 px-5 cursor-pointer hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <Info size={22} className="text-[#FFC107]" strokeWidth={2.5} />
              <span className="font-bold text-gray-800">About KeepInMind</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
          
          <div className="flex items-center justify-between p-4 px-5 cursor-pointer hover:bg-gray-50/50 transition-colors border-t border-gray-100/60" onClick={handleLogout}>
            <div className="flex items-center gap-4">
              <LogOut size={22} className="text-red-400" strokeWidth={2.5} />
              <span className="font-bold text-red-500">Log Out</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>

      </div>

      <AnimatePresence>
        {isEditModalOpen && (
          <EditProfileModal 
            profile={profile} 
            onClose={() => setIsEditModalOpen(false)} 
            onSave={(p) => { 
              const newOverrides = { name: p.name, phone: p.phone, bio: p.bio, avatar: p.avatar };
              setLocalOverrides(newOverrides);
              localStorage.setItem(profileKey, JSON.stringify(newOverrides));
              updateUser({ name: p.name, avatar: p.avatar });
              setIsEditModalOpen(false); 
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
