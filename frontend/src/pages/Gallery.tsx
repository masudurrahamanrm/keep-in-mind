import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Loader2, Image as ImagePlaceholder, History, Trash2, CloudOff, X as XIcon,
  ShieldCheck, Bell, SlidersHorizontal, FileText, Cloud, Lock, IdCard, GraduationCap,
  SquareActivity, Building2, Home, Folder, ArrowRight, ShieldAlert, LockKeyhole, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MediaCard from '../components/MediaCard';
import axios from 'axios';
import MediaUploadFAB from '../components/MediaUploadFAB';
import MediaViewer from '../modals/MediaViewer';
import RenameModal from '../modals/RenameModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import { UploadStatus } from '../components/UploadProgressCard';
import UploadActivityCenter from '../components/UploadActivityCenter';


const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Gallery() {
  const { token, googleAccessToken, signOut, clearGoogleToken } = useAuth();
  const [media, setMedia] = useState<any[]>([]);
  const [storage, setStorage] = useState<{ totalSize: string, totalFiles: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'trash'>('all');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [noGoogleDrive, setNoGoogleDrive] = useState(false);
  const isGoogleConnected = !!(googleAccessToken && googleAccessToken !== 'undefined' && googleAccessToken !== 'null');

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Rename Modal State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [mediaToRename, setMediaToRename] = useState<{ id: string, name: string } | null>(null);

  // Confirm Delete Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ 
    title: string, 
    message: string, 
    onConfirm: () => Promise<void>,
    isBulk: boolean 
  } | null>(null);

  const handleAuthError = (err: any) => {
    const status = err.status || err.response?.status;
    const message = err.response?.data?.error || err.response?.data?.message || err.message || '';
    const isGoogleExpired = status === 401 || status === 403 ||
      (typeof message === 'string' && (message.includes('401') || message.includes('403') || message.includes('invalid_grant') || message.includes('Token has been expired') || message.includes('insufficient')));
    
    if (isGoogleExpired) {
      console.warn('[Gallery] Google token expired — clearing token, user stays logged in.');
      localStorage.removeItem('googleToken');
      // Only clear Google token, don't sign out the whole app
      clearGoogleToken();
      setNoGoogleDrive(true);
      return true;
    }
    return false;
  };

  const fetchStorage = async () => {
    if (!token) return;
    if (!googleAccessToken || googleAccessToken === 'undefined' || googleAccessToken === 'null') {
      // Silently skip if no Google connection, rather than warning
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/gallery/storage`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'google-access-token': googleAccessToken || ''
        }
      });
      
      if (res.status === 401 || res.status === 403) {
        handleAuthError({ status: res.status });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (err) {
      console.error('Gallery storage fetch error:', err);
    }
  };

  const fetchMedia = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/gallery`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        handleAuthError({ status: 401 });
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch gallery');
      const data = await res.json();
      setMedia(data);
      setActiveCount(data.length);
      setImageCount(data.filter((m: any) => m.fileType.startsWith('image/')).length);
      setVideoCount(data.filter((m: any) => m.fileType.startsWith('video/')).length);
      fetchStorage(); // Refresh storage after fetching media
    } catch (err: any) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trash count on initial load so tab shows correct count
  const fetchTrashCount = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/gallery/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrashCount(data.length);
      }
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    if (filterType === 'trash') {
      fetchTrash();
    } else {
      fetchMedia();
      fetchTrashCount(); // keep trash count fresh when browsing active media
    }
  }, [token, filterType]);

  const fetchTrash = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/gallery/trash`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleAuthError({ status: 401 });
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch trash');
      const data = await res.json();
      setMedia(data);
      setTrashCount(data.length);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!token) return;
    if (!isGoogleConnected) {
      setNoGoogleDrive(true);
      return;
    }
    setNoGoogleDrive(false);

    const uploadId = Math.random().toString(36).substring(7);
    const newUpload = { id: uploadId, name: file.name, progress: 0, status: 'uploading' as UploadStatus };
    
    setUploadQueue(prev => [...prev, newUpload]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('googleAccessToken', googleAccessToken!);

    try {
      const { data } = await axios.post(`${API_BASE}/gallery/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadQueue(prev => prev.map(item => 
              item.id === uploadId ? { ...item, progress: percent } : item
            ));
          }
        }
      });

      setUploadQueue(prev => prev.map(item => 
        item.id === uploadId ? { ...item, progress: 100, status: 'completed' as UploadStatus } : item
      ));

      // Add to history
      setUploadHistory(prev => [{
        id: uploadId,
        name: file.name,
        status: 'completed' as UploadStatus,
        progress: 100,
        timestamp: new Date()
      }, ...prev]);

      // Update media list and counts
      const uploaded = data.media;
      setMedia(prev => [uploaded, ...prev]);
      setActiveCount(prev => prev + 1);
      if (uploaded.fileType?.startsWith('image/')) setImageCount(prev => prev + 1);
      else if (uploaded.fileType?.startsWith('video/')) setVideoCount(prev => prev + 1);
      fetchStorage();


      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
      }, 3000);

    } catch (err: any) {
      console.error('Parallel Upload error:', err);
      if (handleAuthError(err)) return;
      
      const msg = err.response?.data?.message || err.message || 'Failed to upload media';
      
      setUploadQueue(prev => prev.map(item => 
        item.id === uploadId ? { ...item, status: 'failed' as UploadStatus } : item
      ));

      // Add failed attempt to history
      setUploadHistory(prev => [{
        id: uploadId,
        name: file.name,
        status: 'failed' as UploadStatus,
        progress: 0,
        timestamp: new Date()
      }, ...prev]);

      console.error('Upload error for', file.name, msg);
      
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
      }, 6000);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    files.forEach(file => uploadFile(file));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/gallery/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Delete failed');
      const deletedItem = media.find(m => m._id === id);
      setMedia(prev => prev.filter(m => m._id !== id));
      setActiveCount(prev => prev - 1);
      if (deletedItem?.fileType.startsWith('image/')) setImageCount(prev => prev - 1);
      else if (deletedItem?.fileType.startsWith('video/')) setVideoCount(prev => prev - 1);
      setTrashCount(prev => prev + 1);
      fetchStorage();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/gallery/${id}/restore`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Restore failed');
      const restoredItem = media.find(m => m._id === id);
      setMedia(prev => prev.filter(m => m._id !== id));
      setTrashCount(prev => prev - 1);
      setActiveCount(prev => prev + 1);
      if (restoredItem?.fileType.startsWith('image/')) setImageCount(prev => prev + 1);
      else if (restoredItem?.fileType.startsWith('video/')) setVideoCount(prev => prev + 1);
      fetchStorage();
    } catch (err) {
      console.error('Restore failed', err);
    }
  };

  const handlePermanentDelete = async (id: string | string[], isBulkAction = false) => {
    // Only allow if in trash mode
    if (filterType !== 'trash' && !isBulkAction) return;
    
    const idsToDelete = Array.isArray(id) ? id : [id];
    
    const performDelete = async () => {
      try {
        await Promise.all(idsToDelete.map(itemId => 
          fetch(`${API_BASE}/gallery/${itemId}/permanent`, {
            method: 'DELETE',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'google-access-token': googleAccessToken || ''
            }
          })
        ));
        
        setMedia(prev => prev.filter(m => !idsToDelete.includes(m._id)));
        setTrashCount(prev => prev - idsToDelete.length);
        fetchStorage();
      } catch (err) {
        console.error('Permanent delete failed', err);
        throw err;
      }
    };

    setConfirmConfig({
      title: isBulkAction ? 'Empty Recycle Bin?' : 'Delete Forever?',
      message: isBulkAction 
        ? `You are about to permanently destroy ${idsToDelete.length} items from your Google Drive. This cannot be undone.`
        : 'This will permanently remove the file from your Google Drive storage.',
      onConfirm: performDelete,
      isBulk: isBulkAction
    });
    setIsConfirmModalOpen(true);
  };

  // Batch Selection Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      
      if (next.size === 0) setIsSelectionMode(false);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    const idsToMove = Array.from(selectedIds);
    
    try {
      // Parallel soft-delete
      await Promise.all(idsToMove.map(id => 
        fetch(`${API_BASE}/gallery/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));

      setMedia(prev => prev.filter(m => !selectedIds.has(m._id)));
      setActiveCount(prev => prev - idsToMove.length);
      setTrashCount(prev => prev + idsToMove.length);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      fetchStorage();
    } catch (err) {
      console.error('Bulk delete failed', err);
    }
  };

  const handleRename = (id: string, currentName: string) => {
    setMediaToRename({ id, name: currentName });
    setIsRenameModalOpen(true);
  };

  const performRename = async (newName: string) => {
    if (!mediaToRename || !token) return;

    try {
      const res = await fetch(`${API_BASE}/gallery/${mediaToRename.id}/rename`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'google-access-token': googleAccessToken || ''
        },
        body: JSON.stringify({ newName })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Rename failed on server');
      }
      
      setMedia(prev => prev.map(m => m._id === mediaToRename.id ? { ...m, fileName: newName } : m));
    } catch (err: any) {
      console.error('[Rename Frontend Error]', err);
      throw err; // Propagate to modal to handle loading state
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // In trash mode, we show everything that's trashed (no sub-filtering for simplicity, or we can add it)
    if (filterType === 'trash') return matchesSearch;

    const matchesType = filterType === 'all' || 
                       (filterType === 'image' && item.fileType.startsWith('image/')) ||
                       (filterType === 'video' && item.fileType.startsWith('video/'));
    return matchesSearch && matchesType;
  });

  // Navigation handlers for MediaViewer
  const handleViewNext = () => {
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((selectedMediaIndex + 1) % filteredMedia.length);
  };

  const handleViewPrev = () => {
    if (selectedMediaIndex === null) return;
    setSelectedMediaIndex((selectedMediaIndex - 1 + filteredMedia.length) % filteredMedia.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedMediaIndex === null) return;
      if (e.key === 'ArrowRight') handleViewNext();
      if (e.key === 'ArrowLeft') handleViewPrev();
      if (e.key === 'Escape') setSelectedMediaIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaIndex]);

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col relative z-10 bg-[#FFF9ED] dark:bg-neutral-900 p-4 sm:p-5 md:p-6 pb-32 sm:pb-32 md:pb-12 min-h-full">

      {/* No Google Drive Connection Banner */}
      <AnimatePresence>
        {noGoogleDrive && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-400">
              <CloudOff size={20} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">Google Drive Not Connected</p>
                <p className="text-xs mt-0.5 opacity-80">Uploads require a connected Google account. Go to <strong>Profile → Manage Backup</strong> to connect your Drive.</p>
              </div>
              <button onClick={() => setNoGoogleDrive(false)} className="shrink-0 p-1 hover:bg-amber-500/20 rounded-full transition-all">
                <XIcon size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────── */}
      <div className="flex flex-col mb-8 mt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-200/50">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white leading-tight">Secure Vault</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Your important documents. Safe. Private. Always with you.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsActivityOpen(!isActivityOpen)}
              className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Bell size={20} className="text-neutral-700 dark:text-neutral-300" />
              {uploadQueue.length > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-amber-500 rounded-full border border-white dark:border-neutral-800"></span>
              )}
            </button>
            <UploadActivityCenter 
              isOpen={isActivityOpen} 
              onClose={() => setIsActivityOpen(false)} 
              queue={uploadQueue}
              history={uploadHistory}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 bg-white dark:bg-neutral-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm border border-neutral-100 dark:border-neutral-700 focus-within:border-amber-400 transition-colors">
            <Search size={18} className="text-neutral-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Search your documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400"
            />
          </div>
          <button className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-2xl flex items-center justify-center shadow-sm border border-neutral-100 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 active:scale-95 transition-all">
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* ── Dashboard Stats Cards ────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 z-10">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-500 flex items-center justify-center shrink-0">
              <FileText size={14} />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-300 leading-tight">Total Documents</span>
          </div>
          <div className="flex items-baseline gap-1 z-10">
            <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">{activeCount}</span>
            <span className="text-[10px] text-neutral-400">Files</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 z-10">
            <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
              <Cloud size={14} />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-300 leading-tight">Cloud Synced</span>
          </div>
          <div className="flex items-baseline gap-1 z-10">
            <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">{activeCount}</span>
            <span className="text-[10px] text-neutral-400">Files</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 z-10">
            <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-500 flex items-center justify-center shrink-0">
              <Lock size={14} />
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-600 dark:text-neutral-300 leading-tight">Encrypted</span>
          </div>
          <div className="flex items-baseline gap-1 z-10">
            <span className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">100%</span>
            <span className="text-[10px] text-neutral-400">Secure</span>
          </div>
        </div>
      </div>

      {/* ── Categories Grid ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { icon: IdCard, color: 'bg-amber-100 text-amber-500', name: 'Government IDs', count: 6 },
          { icon: GraduationCap, color: 'bg-emerald-100 text-emerald-500', name: 'Education', count: 5 },
          { icon: SquareActivity, color: 'bg-rose-100 text-rose-500', name: 'Medical', count: 4 },
          { icon: Building2, color: 'bg-blue-100 text-blue-500', name: 'Banking', count: 3 },
          { icon: Home, color: 'bg-purple-100 text-purple-500', name: 'Property', count: 2 },
          { icon: Folder, color: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300', name: 'Others', count: 4 },
        ].map((cat, i) => (
          <div key={i} className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-95 group">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                <cat.icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{cat.name}</h3>
                <p className="text-xs text-neutral-500">{cat.count} Documents</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-neutral-400 group-hover:translate-x-1 transition-transform hidden sm:block" />
          </div>
        ))}
      </div>

      {/* ── Recently Added ───────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Recently Added</h2>
        <button className="text-sm font-bold text-amber-500 hover:text-amber-600 transition-colors">View All</button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 animate-pulse">
          <Loader2 size={32} className="text-amber-500 animate-spin mb-4" />
          <p className="text-neutral-500 text-sm font-medium">Syncing vault...</p>
        </div>
      ) : filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
          <AnimatePresence mode="popLayout">
            {filteredMedia.map((item, index) => (
              <MediaCard 
                key={item._id} 
                media={item} 
                onDelete={handleDelete} 
                onRename={handleRename}
                onSelect={() => {
                  if (isSelectionMode) toggleSelection(item._id);
                  else setSelectedMediaIndex(index);
                }}
                isTrashMode={filterType === 'trash'}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                isSelected={selectedIds.has(item._id)}
                isSelectionMode={isSelectionMode}
                onToggleSelect={() => toggleSelection(item._id)}
                onLongPress={() => {
                  if (!isSelectionMode) {
                    setIsSelectionMode(true);
                    toggleSelection(item._id);
                  }
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="py-16 flex flex-col items-center justify-center text-center px-4 bg-white dark:bg-neutral-800 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-700 mb-8"
        >
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
            <ImagePlaceholder size={24} className="text-neutral-400" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            {searchQuery ? "No matches found" : "Your vault is empty"}
          </h2>
          <p className="text-sm text-neutral-500">
            {searchQuery 
              ? "Try searching for something else."
              : "Upload your first document. It will be encrypted and safely stored."}
          </p>
        </motion.div>
      )}

      {/* ── Security Banner ──────────────────────── */}
      <div className="bg-gradient-to-r from-[#FFE8B6] to-[#FFD682] dark:from-amber-900/40 dark:to-amber-800/40 rounded-3xl p-5 relative overflow-hidden flex items-center justify-between border border-amber-200/50 dark:border-amber-700/50 shadow-sm mb-4">
        {/* Background Graphic */}
        <LockKeyhole size={100} className="absolute -bottom-8 right-8 text-amber-500/20 dark:text-amber-500/10 rotate-12 pointer-events-none" />
        
        <div className="flex items-start gap-3 sm:gap-4 relative z-10 max-w-[70%]">
          <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/30 flex items-center justify-center shrink-0 border border-amber-300/30">
            <ShieldAlert size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-1">Your data is 100% secure</h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">End-to-end encrypted & stored safely in cloud.</p>
            <button className="text-[10px] uppercase font-bold tracking-wider text-amber-900 dark:text-amber-100 bg-white/80 dark:bg-white/10 px-3 py-1.5 rounded-full hover:bg-white transition-colors">
              Learn more
            </button>
          </div>
        </div>
      </div>

      {/* Animated Upload FAB */}
      <MediaUploadFAB 
        onFilesSelect={handleFilesSelect} 
      />

      {/* Professional Rename Modal */}
      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={performRename}
        currentName={mediaToRename?.name || ''}
      />

      {/* Media Viewer Modal */}
      <AnimatePresence>
        {selectedMediaIndex !== null && filteredMedia[selectedMediaIndex] && (
          <MediaViewer
            media={filteredMedia[selectedMediaIndex]}
            onClose={() => setSelectedMediaIndex(null)}
            onNext={handleViewNext}
            onPrev={handleViewPrev}
            onRename={handleRename}
          />
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      {confirmConfig && (
        <ConfirmDeleteModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isBulk={confirmConfig.isBulk}
        />
      )}

      {/* Selection Action Bar (Floating) */}
      <AnimatePresence>
        {isSelectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-[90vw] glass-panel rounded-3xl border border-white/20 shadow-2xl p-4 flex items-center justify-between gap-6"
          >
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 bg-primary/20 text-primary rounded-2xl flex items-center justify-center font-bold">
                {selectedIds.size}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">Items Selected</span>
                <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">Batch Actions</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setIsSelectionMode(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-6 py-2 bg-error text-white rounded-xl text-xs font-bold shadow-lg shadow-error/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Trash2 size={14} />
                Move to Trash
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
