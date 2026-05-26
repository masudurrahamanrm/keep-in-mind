import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Image as ImagePlaceholder, History, Trash2, CloudOff, X as XIcon } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto w-full flex flex-col h-full relative z-10">

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-10 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-extrabold text-on-surface tracking-tight flex flex-wrap items-center gap-2 md:gap-3">
            Media <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">Gallery</span>
            {storage && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">
                {storage.totalSize} Used
              </span>
            )}
          </h1>
          <p className="text-on-surface-variant font-medium text-sm md:text-base">Your cloud-stored memories, synced with Google Drive.</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 relative">
          {/* Permanent Activity Center Trigger */}
          <button
            onClick={() => setIsActivityOpen(!isActivityOpen)}
            className={`
              relative p-3 rounded-2xl transition-all duration-300 flex items-center gap-2 group
              ${isActivityOpen ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}
              ${uploadQueue.length > 0 && !isActivityOpen ? 'animate-pulse' : ''}
            `}
            title="Upload Activity"
          >
            <History size={20} className={isActivityOpen ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'} />
            
            <AnimatePresence>
              {uploadQueue.length > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white"
                >
                  {uploadQueue.length}
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Activity Dropdown */}
          <UploadActivityCenter 
            isOpen={isActivityOpen} 
            onClose={() => setIsActivityOpen(false)} 
            queue={uploadQueue}
            history={uploadHistory}
          />

          <div className="bg-surface-container rounded-full px-3 sm:px-4 py-2 flex items-center gap-2 border border-outline-variant/30 focus-within:border-primary/50 transition-all flex-1 sm:flex-auto">
            <Search size={16} className="text-on-surface-variant shrink-0" />
            <input 
              type="text" 
              placeholder="Search media..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full sm:w-32 md:w-48 text-on-surface placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="flex flex-wrap items-center justify-between mb-5 md:mb-8 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${filterType === 'all' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            All ({activeCount})
          </button>
          <button 
            onClick={() => setFilterType('image')}
            className={`px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${filterType === 'image' ? 'bg-secondary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            Images ({imageCount})
          </button>
          <button 
            onClick={() => setFilterType('video')}
            className={`px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap min-h-[36px] ${filterType === 'video' ? 'bg-tertiary text-on-tertiary-container' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            Videos ({videoCount})
          </button>
          <button 
            onClick={() => {
              setFilterType('trash');
              setIsSelectionMode(false);
              setSelectedIds(new Set());
            }}
            className={`px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap min-h-[36px] ${filterType === 'trash' ? 'bg-error text-white' : 'bg-surface-container text-error/60 hover:bg-error/10'}`}
          >
            <History size={13} />
            Trash ({trashCount})
          </button>
          
          <AnimatePresence>
            {isSelectionMode && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                className="px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/30 transition-all whitespace-nowrap min-h-[36px]"
              >
                Cancel
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {filterType === 'trash' && media.length > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => handlePermanentDelete(media.map(m => m._id), true)}
              className="px-4 py-2 rounded-2xl text-xs font-bold bg-error/10 text-error hover:bg-error hover:text-white transition-all flex items-center gap-2"
            >
              <Trash2 size={14} />
              Empty Trash
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={48} className="text-primary animate-spin mb-4" />
          <p className="text-on-surface-variant font-medium">Syncing with Google Drive...</p>
        </div>
      ) : filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
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
          className="py-24 flex flex-col items-center justify-center text-center px-4 glass-panel rounded-[3rem] border-dashed border-2 border-outline-variant/30"
        >
          <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-8">
            <ImagePlaceholder size={40} className="text-on-surface-variant/30" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-on-surface mb-2">
            {searchQuery ? "No matches found" : "Your gallery is empty"}
          </h2>
          <p className="max-w-xs text-on-surface-variant font-medium">
            {searchQuery 
              ? "Try searching for something else or clear the filter."
              : "Start by uploading your first image or video. They'll be safe in your Google Drive."}
          </p>
        </motion.div>
      )}

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
