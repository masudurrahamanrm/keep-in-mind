import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight,
  Sun, Clock, Type, ALargeSmall,
  Moon, Sparkles, Volume2,
  Cloud, ArchiveRestore, Download,
  Bell, Lock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { syncNotesToGoogleDrive, fetchNotesFromGoogleDrive } from '../services/driveService';
import { auth } from '../config/firebase';
import PasswordModal from '../modals/PasswordModal';

/* ─── Reusable row components ──────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <p className="text-[#D4A017] font-semibold text-sm px-1 pt-5 pb-2">
      {children}
    </p>
  );
}

function RowCard({ children }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm">
      {children}
    </div>
  );
}

function Row({ icon: Icon, iconColor = '#D4A017', label, right, onPress, divider = true }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-[14px] text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:bg-black/[0.06] transition-colors"
    >
      {/* Icon bubble */}
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}22` }}
      >
        <Icon size={16} color={iconColor} strokeWidth={2.2} />
      </span>

      {/* Label */}
      <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">
        {label}
      </span>

      {/* Right element */}
      <span className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-sm shrink-0">
        {right}
      </span>

      {/* Divider handled by CSS border on parent */}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-neutral-100 dark:bg-neutral-700 ml-[60px]" />;
}

/* ─── Toggle Switch ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-[#FFC107]' : 'bg-neutral-300 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ─── Main Settings Page ────────────────────────────────────────────── */
export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, token, googleAccessToken, signOut } = useAuth();

  // Local UI state
  const [darkMode, setDarkMode]           = useState(theme === 'dark');
  const [animations, setAnimations]       = useState(true);
  const [haptic, setHaptic]               = useState(true);
  const [lockPasscode, setLockPasscode]   = useState(false);
  const [isSyncing, setIsSyncing]         = useState(false);
  const [isFetching, setIsFetching]       = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const hasPassword = auth.currentUser?.providerData?.some(p => p.providerId === 'password');

  const notesKey   = user ? `keep-in-mind-notes-${user._id}`     : 'keep-in-mind-notes-guest';
  const syncTimeKey = user ? `keep-in-mind-last-sync-${user._id}` : 'keep-in-mind-last-sync-guest';

  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem(syncTimeKey) || null);

  const handleDarkMode = (val) => {
    setDarkMode(val);
    setTheme(val ? 'dark' : 'light');
  };

  const handleDriveSync = async () => {
    if (!user || !token || !googleAccessToken) return;
    setIsSyncing(true);
    try {
      const savedNotes = localStorage.getItem(notesKey);
      const notes = savedNotes ? JSON.parse(savedNotes) : [];
      await syncNotesToGoogleDrive(notes, googleAccessToken, token);
      const now = new Date().toLocaleString();
      setLastSynced(now);
      localStorage.setItem(syncTimeKey, now);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDriveRestore = async () => {
    if (!user || !token || !googleAccessToken) return;
    if (!window.confirm('This will replace all local notes with the Drive backup. Continue?')) return;
    setIsFetching(true);
    try {
      const data = await fetchNotesFromGoogleDrive(googleAccessToken, token);
      if (data?.notes) {
        localStorage.setItem(notesKey, JSON.stringify(data.notes));
        const t = data.lastSynced ? new Date(data.lastSynced).toLocaleString() : new Date().toLocaleString();
        setLastSynced(t);
        localStorage.setItem(syncTimeKey, t);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-full bg-[#FDFAF2] dark:bg-neutral-900 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={22} className="text-neutral-800 dark:text-neutral-100" />
        </button>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
          Settings
        </h1>
      </div>

      <div className="px-4">

        {/* ── Preferences ─────────────────────────────────────────── */}
        <SectionLabel>Preferences</SectionLabel>
        <RowCard>
          <Row
            icon={Sun}
            label="Appearance"
            right={<><span className="text-neutral-400 text-sm">Light</span><ChevronRight size={16} /></>}
            onPress={() => {}}
          />
          <Divider />
          <Row
            icon={Clock}
            label="Theme Color"
            right={<><span className="w-4 h-4 rounded-full bg-[#FFC107] inline-block" /><ChevronRight size={16} /></>}
            onPress={() => {}}
          />
          <Divider />
          <Row
            icon={Type}
            label="Font Style"
            right={<><span className="text-neutral-400 text-sm">Inter</span><ChevronRight size={16} /></>}
            onPress={() => {}}
          />
          <Divider />
          <Row
            icon={ALargeSmall}
            label="Text Size"
            right={<><span className="text-neutral-400 text-sm">Medium</span><ChevronRight size={16} /></>}
            onPress={() => {}}
          />
        </RowCard>

        <div className="mt-3 bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Enable Dark Mode */}
          <div className="flex items-center gap-3 px-4 py-[14px]">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-neutral-100 dark:bg-neutral-700">
              <Moon size={16} color="#555" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">Enable Dark Mode</span>
            <Toggle checked={darkMode} onChange={handleDarkMode} />
          </div>
          <Divider />
          {/* Enable Animations */}
          <div className="flex items-center gap-3 px-4 py-[14px]">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFC10722' }}>
              <Sparkles size={16} color="#FFC107" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">Enable Animations</span>
            <Toggle checked={animations} onChange={setAnimations} />
          </div>
          <Divider />
          {/* Haptic Feedback */}
          <div className="flex items-center gap-3 px-4 py-[14px]">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFC10722' }}>
              <Volume2 size={16} color="#FFC107" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">Haptic Feedback</span>
            <Toggle checked={haptic} onChange={setHaptic} />
          </div>
        </div>

        {/* ── Data & Sync ──────────────────────────────────────────── */}
        <SectionLabel>Data &amp; Sync</SectionLabel>
        <RowCard>
          <Row
            icon={Cloud}
            label="Cloud Sync"
            right={<><span className="text-neutral-400 text-sm">{lastSynced ? 'On' : 'On'}</span><ChevronRight size={16} /></>}
            onPress={handleDriveSync}
          />
          <Divider />
          <Row
            icon={ArchiveRestore}
            label="Backup &amp; Restore"
            right={<ChevronRight size={16} />}
            onPress={handleDriveRestore}
          />
          <Divider />
          <Row
            icon={Download}
            label="Export Notes"
            right={<ChevronRight size={16} />}
            onPress={() => {}}
          />
        </RowCard>

        {/* ── General ─────────────────────────────────────────────── */}
        <SectionLabel>General</SectionLabel>
        <RowCard>
          <Row
            icon={Bell}
            label="Notifications"
            right={<ChevronRight size={16} />}
            onPress={() => {}}
          />
          <Divider />
          <div className="flex items-center gap-3 px-4 py-[14px]">
            <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFC10722' }}>
              <Lock size={16} color="#FFC107" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">Lock with Passcode</span>
            <Toggle checked={lockPasscode} onChange={setLockPasscode} />
          </div>
        </RowCard>

      </div>

      {/* Password Modal (kept from original) */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        hasPassword={hasPassword}
      />
    </div>
  );
}