import { useState, useEffect } from 'react';
import { Cloud, HardDrive, RefreshCw, ArchiveRestore, Clock, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../hooks/useSync';
import { clsx } from 'clsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SyncDashboard() {
  const { user, token, googleAccessToken } = useAuth();
  const { isOnline, isSyncing, lastSyncTime, performSync } = useSync();
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchBackups();
  }, [token]);

  const fetchBackups = async () => {
    if (!token) return;
    setIsLoadingBackups(true);
    try {
      const res = await axios.get(`${API_URL}/sync/backups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackups(res.data);
    } catch (err) {
      console.error('Failed to fetch backups', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleManualBackup = async () => {
    if (!token || !googleAccessToken) {
      setMessage({ text: 'Google Drive not connected', type: 'error' });
      return;
    }
    
    setIsBackingUp(true);
    setMessage(null);
    try {
      await axios.post(`${API_URL}/sync/backup`, { triggerType: 'manual' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Backup completed successfully', type: 'success' });
      fetchBackups();
    } catch (err) {
      setMessage({ text: 'Backup failed', type: 'error' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (fileId: string) => {
    if (!window.confirm('Are you sure? This will wipe your current local notes and replace them with this backup.')) return;
    
    setIsRestoring(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_URL}/sync/restore/${fileId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: `Restored ${res.data.count} notes successfully. Reloading...`, type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setMessage({ text: 'Restore failed', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
        <Cloud className="text-primary" size={32} />
        Sync & Backup
      </h1>

      {message && (
        <div className={clsx("p-4 rounded-xl mb-6 flex items-center gap-2", message.type === 'success' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Sync Status Card */}
      <div className="bg-surface rounded-3xl p-6 shadow-sm border border-outline-variant/20 mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <RefreshCw size={20} className={isSyncing ? "animate-spin text-primary" : "text-on-surface-variant"} />
          Cloud Sync
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-4 rounded-2xl">
            <p className="text-sm text-on-surface-variant font-medium mb-1">Status</p>
            <div className="flex items-center gap-2 font-bold">
              <div className={clsx("w-3 h-3 rounded-full", isOnline ? "bg-emerald-500" : "bg-red-500")} />
              {isOnline ? 'Online (Real-time)' : 'Offline (Local mode)'}
            </div>
          </div>
          <div className="bg-surface-container-low p-4 rounded-2xl">
            <p className="text-sm text-on-surface-variant font-medium mb-1">Last Sync</p>
            <p className="font-bold flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
            </p>
          </div>
          <div className="flex items-center justify-end">
            <button 
              onClick={performSync}
              disabled={isSyncing || !isOnline}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Google Drive Backup Card */}
      <div className="bg-surface rounded-3xl p-6 shadow-sm border border-outline-variant/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HardDrive size={20} className="text-primary" />
            Google Drive Backups
          </h2>
          <button 
            onClick={handleManualBackup}
            disabled={isBackingUp || !googleAccessToken}
            className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-bold hover:bg-secondary/90 transition-all disabled:opacity-50 text-sm flex items-center gap-2"
          >
            {isBackingUp ? <RefreshCw size={16} className="animate-spin" /> : <Cloud size={16} />}
            Create Backup
          </button>
        </div>

        {!googleAccessToken && (
          <div className="p-4 bg-amber-500/10 text-amber-600 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Google Drive not connected</p>
              <p className="text-sm opacity-80">Link your Google account in Settings to enable encrypted cloud backups.</p>
            </div>
          </div>
        )}

        {/* Backups List */}
        <div className="space-y-3">
          {isLoadingBackups ? (
             <div className="p-8 text-center text-on-surface-variant">Loading backups...</div>
          ) : backups.length === 0 ? (
             <div className="p-8 text-center text-on-surface-variant bg-surface-container-low rounded-2xl border border-dashed border-outline-variant/50">
               No backups found in Google Drive.
             </div>
          ) : (
            backups.map(backup => (
              <div key={backup._id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors">
                <div className="flex flex-col mb-4 md:mb-0">
                  <span className="font-bold flex items-center gap-2">
                    <ArchiveRestore size={16} className="text-primary" />
                    {new Date(backup.createdAt).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant mt-1">
                    <span>{backup.noteCount} notes</span>
                    <span>•</span>
                    <span>{formatSize(backup.sizeBytes)}</span>
                    <span>•</span>
                    <span className="uppercase tracking-wider">{backup.triggerType}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleRestore(backup.driveFileId)}
                  disabled={isRestoring}
                  className="w-full md:w-auto px-4 py-2 bg-error/10 text-error hover:bg-error hover:text-white rounded-lg font-bold transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
