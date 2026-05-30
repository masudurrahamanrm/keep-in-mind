import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight,
  Sun, Clock, Moon, Sparkles, Volume2,
  Cloud, ArchiveRestore, Download,
  Bell, Lock, Type, ALargeSmall
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { syncNotesToGoogleDrive, fetchNotesFromGoogleDrive } from '../services/driveService';

/* ─── Toggle ─────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-[52px] h-7 rounded-full transition-colors duration-300 focus:outline-none ${
        checked ? 'bg-[#FBBF24]' : 'bg-neutral-200 dark:bg-neutral-600'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[24px] h-[24px] rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? 'translate-x-[24px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ─── Section Label ───────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <h2 className="text-[#F3A83B] font-semibold text-sm mb-3 ml-1">{children}</h2>
  );
}

/* ─── Card Wrapper ────────────────────────────────────────────────── */
function Card({ children }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-[20px] px-4 py-1 shadow-sm overflow-hidden">
      {children}
    </div>
  );
}

/* ─── Divider ─────────────────────────────────────────────────────── */
function Divider() {
  return <div className="h-px bg-neutral-100 dark:bg-neutral-700" />;
}

/* ─── Standard Row (chevron right) ──────────────────────────────── */
function LinkRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-[#F3A83B]">
          <Icon size={22} strokeWidth={2} />
        </div>
        <span className="font-medium text-neutral-900 dark:text-neutral-100 text-[15px]">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500 text-sm">
        {value && <span>{value}</span>}
        <ChevronRight size={16} strokeWidth={2} />
      </div>
    </div>
  );
}

/* ─── Toggle Row ──────────────────────────────────────────────────── */
function ToggleRow({ icon: Icon, label, checked, onChange, iconColor = '#F3A83B', darkIcon = false }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div className={darkIcon ? 'text-neutral-500 dark:text-neutral-400' : ''} style={darkIcon ? {} : { color: iconColor }}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <span className="font-medium text-neutral-900 dark:text-neutral-100 text-[15px]">{label}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ─── Theme Color dot ─────────────────────────────────────────────── */
function ThemeColorDot({ color }) {
  const colorMap = {
    yellow: '#FBC02D',
    blue: '#007AFF',
    green: '#34C759',
    purple: '#AF52DE',
  };
  return (
    <div className="flex items-center gap-2 text-neutral-400 text-sm">
      <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: colorMap[color] || '#FBC02D' }} />
      <ChevronRight size={16} strokeWidth={2} />
    </div>
  );
}

/* ─── FontAT icon ─────────────────────────────────────────────────── */
function FontATIcon({ size = 22, color = '#F3A83B' }) {
  return (
    <span style={{ color, fontWeight: 700, fontSize: size * 0.8, letterSpacing: '-1px', lineHeight: 1 }}>
      AT
    </span>
  );
}

/* ─── TextSize icon ──────────────────────────────────────────────── */
function TextSizeIcon({ color = '#F3A83B' }) {
  return (
    <span style={{ color, fontWeight: 600, lineHeight: 1 }}>
      <span style={{ fontSize: 12 }}>a</span>
      <span style={{ fontSize: 18 }}>A</span>
    </span>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, token, googleAccessToken } = useAuth();
  const { 
    themeColor, setThemeColor, 
    fontStyle, setFontStyle, 
    textSize, setTextSize,
    hapticFeedback, setHapticFeedback,
    triggerHaptic 
  } = usePreferences();

  const [darkMode, setDarkMode]         = useState(theme === 'dark');
  const [animations, setAnimations]     = useState(true);
  const [lockPasscode, setLockPasscode] = useState(false);
  const [isSyncing, setIsSyncing]       = useState(false);
  const [isFetching, setIsFetching]     = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const notesKey    = user ? `keep-in-mind-notes-${user._id}` : 'keep-in-mind-notes-guest';
  const syncTimeKey = user ? `keep-in-mind-last-sync-${user._id}` : 'keep-in-mind-last-sync-guest';
  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem(syncTimeKey) || null);

  const handleDarkMode = (val) => {
    setDarkMode(val);
    setTheme(val ? 'dark' : 'light');
    triggerHaptic();
  };

  const cycleFontStyle = () => {
    const fonts = ['inter', 'outfit', 'roboto', 'opensans'];
    setFontStyle(fonts[(fonts.indexOf(fontStyle) + 1) % fonts.length]);
    triggerHaptic();
  };

  const cycleTextSize = () => {
    const sizes = ['small', 'medium', 'large'];
    setTextSize(sizes[(sizes.indexOf(textSize) + 1) % sizes.length]);
    triggerHaptic();
  };

  const handleDriveSync = async () => {
    if (!user || !token || !googleAccessToken) return;
    setIsSyncing(true);
    try {
      const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      await syncNotesToGoogleDrive(notes, googleAccessToken, token);
      const now = new Date().toLocaleString();
      setLastSynced(now);
      localStorage.setItem(syncTimeKey, now);
    } catch (err) { console.error(err); }
    finally { setIsSyncing(false); }
  };

  const handleDriveRestore = async () => {
    if (!user || !token || !googleAccessToken) return;
    if (!window.confirm('This will replace all local notes with the Drive backup. Continue?')) return;
    setIsFetching(true);
    try {
      const { fetchNotesFromGoogleDrive } = await import('../services/driveService');
      const data = await fetchNotesFromGoogleDrive(googleAccessToken, token);
      if (data?.notes) {
        localStorage.setItem(notesKey, JSON.stringify(data.notes));
        const t = data.lastSynced ? new Date(data.lastSynced).toLocaleString() : new Date().toLocaleString();
        setLastSynced(t);
        localStorage.setItem(syncTimeKey, t);
      }
    } catch (err) { console.error(err); }
    finally { setIsFetching(false); }
  };

  return (
    <div className="min-h-full bg-[#FCF7ED] dark:bg-neutral-900 pb-28">


      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-12 space-y-8">

        {/* ── Preferences ──────────────────────────────────────────── */}
        <section>
          <SectionLabel>Preferences</SectionLabel>

          {/* Group 1: chevron rows */}
          <Card>
            <div onClick={() => navigate('/settings/theme')} className="cursor-pointer">
              <LinkRow icon={Sun} label="Appearance" value={theme.charAt(0).toUpperCase() + theme.slice(1)} />
            </div>
            <Divider />
            <div onClick={() => navigate('/settings/theme-color')} className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-[#F3A83B]"><Clock size={22} strokeWidth={2} /></div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 text-[15px]">Theme Color</span>
              </div>
              <ThemeColorDot color={themeColor} />
            </div>
            <Divider />
            <div onClick={cycleFontStyle} className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-[#F3A83B]"><FontATIcon /></div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 text-[15px]">Font Style</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <span className="capitalize">{fontStyle}</span>
                <ChevronRight size={16} strokeWidth={2} />
              </div>
            </div>
            <Divider />
            <div onClick={cycleTextSize} className="flex items-center justify-between py-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-[#F3A83B]"><TextSizeIcon /></div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 text-[15px]">Text Size</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <span className="capitalize">{textSize}</span>
                <ChevronRight size={16} strokeWidth={2} />
              </div>
            </div>
          </Card>

          {/* Group 2: toggle rows */}
          <div className="mt-4">
            <Card>
              <ToggleRow icon={Moon}     label="Enable Dark Mode"   checked={theme === 'dark'}    onChange={handleDarkMode}   darkIcon />
              <Divider />
              <ToggleRow icon={Sparkles} label="Enable Animations"  checked={animations}  onChange={setAnimations} />
              <Divider />
              <ToggleRow icon={Volume2}  label="Haptic Feedback"    checked={hapticFeedback}      onChange={(v) => { setHapticFeedback(v); triggerHaptic(); }} />
            </Card>
          </div>
        </section>

        {/* ── Data & Sync ───────────────────────────────────────────── */}
        <section>
          <SectionLabel>Data &amp; Sync</SectionLabel>
          <Card>
            <div onClick={() => navigate('/cloud-sync')} className="cursor-pointer">
              <LinkRow icon={Cloud}          label="Cloud Sync"        value={lastSynced ? 'On' : 'Off'} />
            </div>
            <Divider />
            <div onClick={() => navigate('/cloud-sync')} className="cursor-pointer">
              <LinkRow icon={ArchiveRestore} label="Backup & Restore" />
            </div>
            <Divider />
            <LinkRow icon={Download} label="Export Notes" />
          </Card>
        </section>

        {/* ── General ──────────────────────────────────────────────── */}
        <section>
          <SectionLabel>General</SectionLabel>
          <Card>
            <LinkRow icon={Bell} label="Notifications" />
            <Divider />
            <ToggleRow icon={Lock} label="Lock with Passcode" checked={lockPasscode} onChange={setLockPasscode} />
          </Card>
        </section>

      </div>

    </div>
  );
}