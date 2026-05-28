import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, Cloud, CloudUpload, CloudDownload, RefreshCw,
  CheckCircle, AlertCircle, Clock, HardDrive, FileText,
  LogIn, LogOut, Loader2, Shield, Wifi, WifiOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { syncNotesToGoogleDrive, fetchNotesFromGoogleDrive } from '../services/driveService';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function CloudSync() {
  const navigate = useNavigate();
  const { user, token, googleAccessToken, updateGoogleToken, clearGoogleToken } = useAuth();

  const isConnected = !!(googleAccessToken && googleAccessToken !== 'undefined' && googleAccessToken !== 'null');

  const notesKey = user ? `keep-in-mind-notes-${user._id}` : 'keep-in-mind-notes-guest';
  const syncTimeKey = user ? `keep-in-mind-last-sync-${user._id}` : 'keep-in-mind-last-sync-guest';

  const [lastSynced, setLastSynced] = useState<string | null>(() => localStorage.getItem(syncTimeKey) || null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [noteCount, setNoteCount] = useState(0);
  const [storage, setStorage] = useState<any>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);

  // Count local notes
  useEffect(() => {
    try {
      const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      setNoteCount(notes.length);
    } catch { setNoteCount(0); }
  }, [notesKey]);

  // Fetch Drive storage when connected
  useEffect(() => {
    if (isConnected && token) fetchStorage();
  }, [isConnected, token]);

  const fetchStorage = async () => {
    if (!googleAccessToken || !token) return;
    setLoadingStorage(true);
    try {
      const res = await fetch(`${API_BASE}/drive/storage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ googleAccessToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (err) {
      console.error('Storage fetch error:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleConnect = async () => {
    // Redirect to backend OAuth to get updated scopes including Drive
    // If backend is configured, it could handle the prompt
    window.location.href = `${API_BASE}/auth/google`;
  };

  const handleDisconnect = () => {
    clearGoogleToken();
    setStorage(null);
    setSyncResult({ type: 'success', message: 'Google Drive disconnected.' });
  };

  const handleSync = async () => {
    if (!user || !token || !googleAccessToken) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      let notes = [];
      const res = await fetch(`${API_BASE}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        notes = await res.json();
      } else {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      }
      
      const result = await syncNotesToGoogleDrive(notes, googleAccessToken, token);
      const now = new Date().toLocaleString();
      setLastSynced(now);
      localStorage.setItem(syncTimeKey, now);
      setSyncResult({
        type: 'success',
        message: result.message || `${notes.length} notes synced to Drive!`
      });
      fetchStorage(); // Refresh storage after sync
    } catch (err: any) {
      setSyncResult({ type: 'error', message: err.message || 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!user || !token || !googleAccessToken) return;
    setIsFetching(true);
    setSyncResult(null);
    try {
      const data = await fetchNotesFromGoogleDrive(googleAccessToken, token);
      if (data?.notes && data.notes.length > 0) {
        localStorage.setItem(notesKey, JSON.stringify(data.notes));
        const t = data.lastSynced ? new Date(data.lastSynced).toLocaleString() : new Date().toLocaleString();
        setLastSynced(t);
        localStorage.setItem(syncTimeKey, t);
        setNoteCount(data.notes.length);
        setSyncResult({ type: 'success', message: `${data.notes.length} notes restored from Drive!` });
      } else {
        setSyncResult({ type: 'error', message: 'No backup found on Google Drive.' });
      }
    } catch (err: any) {
      setSyncResult({ type: 'error', message: err.message || 'Restore failed' });
    } finally {
      setIsFetching(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="min-h-full bg-[#FFF9ED] dark:bg-neutral-900 pb-28">

      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-center px-4 pt-6 pb-3 relative">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-neutral-800 dark:text-neutral-100 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold text-neutral-900 dark:text-white">
          Cloud Sync
        </h1>
      </div>

      <div className="px-5 pt-2 pb-12 space-y-5">

        {/* ── Connection Status Hero Card ───────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl shadow-sm"
          style={{
            background: isConnected
              ? 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 50%, #6EE7B7 100%)'
              : 'linear-gradient(135deg, #FFE8B6 0%, #FFD682 50%, #FFC14A 100%)'
          }}
        >
          {/* Decorative */}
          <span className="absolute top-6 right-8 text-white/30 text-2xl select-none">✦</span>
          <span className="absolute bottom-8 left-6 text-white/20 text-lg select-none">✦</span>

          <div className="p-6 flex flex-col items-center text-center">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${
              isConnected
                ? 'bg-white/90 text-green-600'
                : 'bg-white/90 text-amber-600'
            }`}>
              {isConnected ? <Wifi size={28} /> : <WifiOff size={28} />}
            </div>

            <h2 className="text-lg font-bold text-neutral-900 mb-1">
              {isConnected ? 'Google Drive Connected' : 'Not Connected'}
            </h2>
            <p className="text-sm text-neutral-700 mb-5 max-w-[260px]">
              {isConnected
                ? 'Your notes are backed up to Google Drive.'
                : 'Connect Google Drive to sync your notes across devices.'}
            </p>

            {isConnected ? (
              <div className="flex gap-3">
                <button
                  onClick={fetchStorage}
                  disabled={loadingStorage}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/80 hover:bg-white text-green-700 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
                >
                  <RefreshCw size={15} className={loadingStorage ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-700 rounded-xl text-sm font-semibold transition-all active:scale-95"
                >
                  <LogOut size={15} />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-2.5 px-6 py-3 bg-white text-neutral-800 rounded-2xl font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-60"
              >
                {isConnecting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {isConnecting ? 'Connecting...' : 'Connect Google Drive'}
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Status Toast ──────────────────────── */}
        <AnimatePresence>
          {syncResult && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center gap-3 p-4 rounded-2xl shadow-sm ${
                syncResult.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {syncResult.type === 'success' ? (
                <CheckCircle size={20} className="text-green-600 shrink-0" />
              ) : (
                <AlertCircle size={20} className="text-red-500 shrink-0" />
              )}
              <p className={`text-sm font-medium ${
                syncResult.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-700 dark:text-red-200'
              }`}>
                {syncResult.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Sync Actions ─────────────────────── */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-[#F3A83B] font-semibold text-sm ml-1">Actions</h3>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">

              {/* Sync to Drive */}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors active:bg-neutral-100 dark:active:bg-neutral-700 disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    {isSyncing ? (
                      <Loader2 size={20} className="text-blue-500 animate-spin" />
                    ) : (
                      <CloudUpload size={20} className="text-blue-500" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 block">
                      {isSyncing ? 'Syncing...' : 'Sync to Drive'}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Upload {noteCount} local notes to Google Drive
                    </span>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-neutral-300 rotate-180" />
              </button>

              <div className="h-px bg-neutral-100 dark:bg-neutral-700 ml-[72px]" />

              {/* Restore from Drive */}
              <button
                onClick={handleRestore}
                disabled={isFetching}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors active:bg-neutral-100 dark:active:bg-neutral-700 disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    {isFetching ? (
                      <Loader2 size={20} className="text-amber-500 animate-spin" />
                    ) : (
                      <CloudDownload size={20} className="text-amber-500" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-100 block">
                      {isFetching ? 'Restoring...' : 'Restore from Drive'}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Download backup and replace local notes
                    </span>
                  </div>
                </div>
                <ChevronLeft size={16} className="text-neutral-300 rotate-180" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Storage & Info ────────────────────── */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-[#F3A83B] font-semibold text-sm ml-1">Storage</h3>
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border border-neutral-100 dark:border-neutral-700 space-y-4">

              {loadingStorage ? (
                <div className="flex items-center justify-center py-6 gap-2 text-neutral-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm font-medium">Loading storage info...</span>
                </div>
              ) : storage ? (
                <>
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                        {formatBytes(storage.usedBytes)} used
                      </span>
                      <span className="text-xs font-medium text-neutral-500">
                        {storage.isUnlimited ? 'Unlimited' : `of ${formatBytes(storage.totalBytes)}`}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${storage.totalBytes ? Math.min(100, Math.round((storage.usedBytes / storage.totalBytes) * 100)) : 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-[#FBC02D] to-[#FF9E4A]"
                      />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/40 rounded-xl">
                      <HardDrive size={16} className="text-[#F3A83B] shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">App Storage</p>
                        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{formatBytes(storage.appUsedBytes)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-700/40 rounded-xl">
                      <FileText size={16} className="text-[#F3A83B] shrink-0" />
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Backed Up</p>
                        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{storage.appFileCount} files</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center py-4 text-neutral-400">
                  <Cloud size={28} className="mb-2 opacity-50" />
                  <p className="text-sm">Tap refresh to load storage info</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Sync Info ────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-[#F3A83B] font-semibold text-sm ml-1">Info</h3>
          <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">

            {/* Last Sync */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#F3A83B22] flex items-center justify-center">
                  <Clock size={16} className="text-[#F3A83B]" />
                </div>
                <span className="text-[15px] font-medium text-neutral-800 dark:text-neutral-100">Last Synced</span>
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[140px] text-right truncate">
                {lastSynced || 'Never'}
              </span>
            </div>

            <div className="h-px bg-neutral-100 dark:bg-neutral-700 ml-16" />

            {/* Local Notes */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#F3A83B22] flex items-center justify-center">
                  <FileText size={16} className="text-[#F3A83B]" />
                </div>
                <span className="text-[15px] font-medium text-neutral-800 dark:text-neutral-100">Local Notes</span>
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {noteCount} notes
              </span>
            </div>

            <div className="h-px bg-neutral-100 dark:bg-neutral-700 ml-16" />

            {/* Security */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#F3A83B22] flex items-center justify-center">
                  <Shield size={16} className="text-[#F3A83B]" />
                </div>
                <span className="text-[15px] font-medium text-neutral-800 dark:text-neutral-100">Encryption</span>
              </div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                TLS in transit
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
