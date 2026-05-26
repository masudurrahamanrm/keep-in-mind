import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, Image as ImagePlaceholder, ArrowLeft, Search, FileText, 
  Trash2, SlidersHorizontal, Bell, CloudOff, X as XIcon 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DocumentListCard from '../components/DocumentListCard';
import axios from 'axios';
import MediaUploadFAB from '../components/MediaUploadFAB';
import MediaViewer from '../modals/MediaViewer';
import RenameModal from '../modals/RenameModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import { UploadStatus } from '../components/UploadProgressCard';
import UploadActivityCenter from '../components/UploadActivityCenter';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function VaultCategory() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { token, googleAccessToken, clearGoogleToken } = useAuth();
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  
  const [noGoogleDrive, setNoGoogleDrive] = useState(false);
  const isGoogleConnected = !!(googleAccessToken && googleAccessToken !== 'undefined' && googleAccessToken !== 'null');

  // Modal States
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [mediaToRename, setMediaToRename] = useState<{ id: string, name: string } | null>(null);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ 
    title: string, 
    message: string, 
    onConfirm: () => Promise<void>
  } | null>(null);

  const formattedCategory = (categoryId || '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Ids', 'IDs');

  const getCategorySubtext = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'government ids': return 'Store SSN, Passports, and Licenses securely.';
      case 'education': return 'Store degrees, transcripts, and certificates securely.';
      case 'medical': return 'Store prescriptions, test reports, and medical records securely.';
      case 'banking': return 'Store bank statements, tax returns, and financial documents securely.';
      case 'property': return 'Store deeds, agreements, and property records securely.';
      default: return 'Store your important documents safely in the cloud.';
    }
  };

  const handleAuthError = (err: any) => {
    const status = err.status || err.response?.status;
    if (status === 401 || status === 403) {
      clearGoogleToken();
      setNoGoogleDrive(true);
      return true;
    }
    return false;
  };

  const fetchDocuments = async () => {
    if (!token || !categoryId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/documents/${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401) {
        handleAuthError({ status: 401 });
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch documents');
      
      const data = await res.json();
      // Map document schema keys to media card expectations if necessary
      const mappedData = data.map((doc: any) => ({
        ...doc,
        _id: doc._id,
        fileName: doc.title,
        fileType: doc.mimeType,
        fileId: doc.driveFileId,
        size: doc.size,
        thumbnailUrl: doc.thumbnailUrl,
        uploadedAt: doc.createdAt
      }));
      setDocuments(mappedData);
    } catch (err: any) {
      console.error(err);
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token, categoryId]);

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
    formData.append('category', formattedCategory);
    formData.append('title', file.name);

    try {
      const { data } = await axios.post(`${API_BASE}/documents/upload`, formData, {
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

      setUploadHistory(prev => [{
        id: uploadId,
        name: file.name,
        status: 'completed' as UploadStatus,
        progress: 100,
        timestamp: new Date()
      }, ...prev]);

      const doc = data.document;
      const mappedDoc = {
        ...doc,
        _id: doc._id,
        fileName: doc.title,
        fileType: doc.mimeType,
        fileId: doc.driveFileId,
        size: doc.size,
        thumbnailUrl: doc.thumbnailUrl || (data.driveData?.thumbnailLink),
        fileUrl: data.driveData?.webViewLink,
        uploadedAt: doc.createdAt
      };

      setDocuments(prev => [mappedDoc, ...prev]);

      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
      }, 3000);

    } catch (err: any) {
      console.error('Upload error:', err);
      if (handleAuthError(err)) return;
      
      setUploadQueue(prev => prev.map(item => 
        item.id === uploadId ? { ...item, status: 'failed' as UploadStatus } : item
      ));

      setUploadHistory(prev => [{
        id: uploadId,
        name: file.name,
        status: 'failed' as UploadStatus,
        progress: 0,
        timestamp: new Date()
      }, ...prev]);

      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.id !== uploadId));
      }, 6000);
    }
  };

  const handleFilesSelect = (files: File[]) => {
    files.forEach(file => uploadFile(file));
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document from your Vault and Google Drive? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/documents/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error('Delete failed');
          setDocuments(prev => prev.filter(m => m._id !== id));
        } catch (err) {
          console.error('Delete failed', err);
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleRename = (id: string, currentName: string) => {
    setMediaToRename({ id, name: currentName });
    setIsRenameModalOpen(true);
  };

  const performRename = async (newName: string) => {
    if (!mediaToRename || !token) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${mediaToRename.id}/rename`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newName })
      });
      if (!res.ok) throw new Error('Rename failed');
      setDocuments(prev => prev.map(m => m._id === mediaToRename.id ? { ...m, fileName: newName, title: newName } : m));
    } catch (err: any) {
      console.error('Rename Error', err);
      throw err;
    }
  };

  const filteredMedia = documents.filter(item => 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col relative z-10 bg-[#FFF9ED] dark:bg-neutral-900 p-4 sm:p-5 md:p-6 pb-32 min-h-full">
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

      <div className="flex flex-col mb-8 mt-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={24} className="text-neutral-700 dark:text-neutral-300" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white leading-tight">{formattedCategory}</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{getCategorySubtext(formattedCategory)}</p>
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

        {/* Security Indicators */}
        <div className="flex items-center gap-3 mt-1 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Cloud Synced
          </div>
          <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-purple-200 dark:border-purple-500/20 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            AES-256 Protected
          </div>
          <div className="text-[10px] font-medium text-neutral-400 ml-auto flex items-center gap-1">
             <FileText size={10} /> {documents.length} Files
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 bg-white dark:bg-neutral-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm border border-neutral-100 dark:border-neutral-700 focus-within:border-amber-400 transition-colors">
            <Search size={18} className="text-neutral-400 shrink-0" />
            <input 
              type="text" 
              placeholder={`Search ${formattedCategory}...`}
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={32} className="text-amber-500 animate-spin mb-4" />
          <p className="text-neutral-500 text-sm font-medium">Decrypting Vault...</p>
        </div>
      ) : filteredMedia.length > 0 ? (
        <div className="flex flex-col gap-2 mb-8">
          <AnimatePresence mode="popLayout">
            {filteredMedia.map((item, index) => (
              <DocumentListCard 
                key={item._id} 
                media={item} 
                onDelete={handleDelete} 
                onRename={handleRename}
                onSelect={() => setSelectedMediaIndex(index)}
                streamEndpoint="/documents/stream"
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="py-20 flex flex-col items-center justify-center text-center px-4 bg-white dark:bg-neutral-800 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-700 mb-8"
        >
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
            <FileText size={24} className="text-neutral-400" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            {searchQuery ? "No matches found" : "Category is empty"}
          </h2>
          <p className="text-sm text-neutral-500">
            {searchQuery 
              ? "Try searching for something else."
              : `Upload your first ${formattedCategory} document.`}
          </p>
        </motion.div>
      )}

      <MediaUploadFAB onFilesSelect={handleFilesSelect} />

      <RenameModal
        isOpen={isRenameModalOpen}
        onClose={() => setIsRenameModalOpen(false)}
        onRename={performRename}
        currentName={mediaToRename?.name || ''}
      />

      {confirmConfig && (
        <ConfirmDeleteModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
        />
      )}

      <AnimatePresence>
        {selectedMediaIndex !== null && filteredMedia[selectedMediaIndex] && (
          <MediaViewer
            media={filteredMedia[selectedMediaIndex]}
            onClose={() => setSelectedMediaIndex(null)}
            onNext={() => setSelectedMediaIndex((selectedMediaIndex + 1) % filteredMedia.length)}
            onPrev={() => setSelectedMediaIndex((selectedMediaIndex - 1 + filteredMedia.length) % filteredMedia.length)}
            onRename={handleRename}
            streamEndpoint="/documents/stream"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
