import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, Download, Image as ImageIcon, Video, Calendar, HardDrive, Maximize2, Pencil, History, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface MediaCardProps {
  key?: React.Key;
  media: any;
  onDelete: (id: string) => void | Promise<void>;
  onRename: (id: string, currentName: string) => void | Promise<void>;
  onSelect: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onToggleSelect?: () => void;
  isTrashMode?: boolean;
  onRestore?: (id: string) => void | Promise<void>;
  onPermanentDelete?: (id: string) => void | Promise<void>;
  streamEndpoint?: string;
}

export default function MediaCard({ 
  media, 
  onDelete, 
  onRename, 
  onSelect,
  onLongPress,
  isTrashMode = false,
  onRestore,
  onPermanentDelete,
  isSelected = false,
  isSelectionMode = false,
  onToggleSelect,
  streamEndpoint = '/gallery/stream'
}: MediaCardProps) {
  const { googleAccessToken } = useAuth();
  const isVideo = media.fileType.startsWith('video/');
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const longPressOccurred = React.useRef(false);
  
  const handlePointerDown = () => {
    if (isSelectionMode) return;
    longPressOccurred.current = false;
    
    timerRef.current = setTimeout(() => {
      onLongPress?.();
      longPressOccurred.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const isValidToken = googleAccessToken && googleAccessToken !== 'undefined' && googleAccessToken !== 'null';
  const thumbnailUrl = media.thumbnailUrl || (media.fileId && isValidToken 
    ? `${API_BASE}${streamEndpoint}/${media.fileId}?token=${googleAccessToken}&thumbnail=true`
    : null);
  const [thumbnailError, setThumbnailError] = useState(false);
  
  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={(e) => {
        // If a long press just happened, don't open the viewer or toggle twice
        if (longPressOccurred.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (isSelectionMode) onToggleSelect?.();
        else onSelect();
      }}
      className={`group relative aspect-square overflow-hidden rounded-2xl bg-surface-container cursor-pointer border transition-all duration-300 ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-surface scale-[0.98]' : 'border-on-surface/5'}`}
    >
      {/* Thumbnail Layer */}
      <div className="absolute inset-0">
        {thumbnailUrl && !thumbnailError ? (
          <img
            src={thumbnailUrl}
            alt={media.fileName}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-on-surface-variant/30 bg-surface-container-high">
            {isVideo ? <Video size={32} /> : <ImageIcon size={32} />}
          </div>
        )}
      </div>

      {/* Selection State Indicator (Always visible in selection mode) */}
      {isSelectionMode && (
        <div className={`absolute top-2 left-2 z-30 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-primary border-primary text-white scale-110' : 'bg-black/20 border-white/40 text-transparent'}`}>
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      {/* Hover Overlay Layer */}
      <div className={`absolute inset-0 z-20 transition-all duration-300 ${isSelectionMode ? 'opacity-0' : (isTrashMode ? 'opacity-100 bg-black/20' : 'opacity-0 group-hover:opacity-100')}`}>
        {/* Top Action Bar */}
        <div className="absolute top-0 inset-x-0 p-1.5 flex justify-between items-start">
          {/* Left: Type Indicator & Rename */}
          <div className="flex gap-1 items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-md border border-white/10">
              {isVideo ? <Video size={10} /> : <ImageIcon size={10} />}
            </div>
            {!isTrashMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(media._id, media.fileName);
                }}
                className="p-1.5 px-2 bg-black/60 hover:bg-primary text-white backdrop-blur-xl rounded-lg transition-all border border-white/10"
                title="Rename"
              >
                <Pencil size={12} />
              </button>
            )}
            {isTrashMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore?.(media._id);
                }}
                className="p-1.5 px-3 bg-secondary text-white backdrop-blur-xl rounded-lg transition-all border border-white/10 shadow-lg flex items-center gap-1.5 hover:scale-105 active:scale-95"
                title="Restore"
              >
                <History size={14} />
                <span className="text-[10px] font-black uppercase tracking-tighter">Restore</span>
              </button>
            )}
          </div>

          {/* Right: The DELETE Button (Classic Position) - Shrinked for alignment */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isTrashMode) onPermanentDelete?.(media._id);
              else onDelete(media._id);
            }}
            className={`backdrop-blur-xl rounded-full transition-all border border-white/10 shadow-lg flex items-center justify-center hover:scale-110 active:scale-90 ${isTrashMode ? 'bg-error text-white h-9 w-9' : 'bg-error/80 hover:bg-error text-white h-7 w-7'}`}
            title={isTrashMode ? "Delete Permanently" : "Move to Trash"}
          >
            <Trash2 size={isTrashMode ? 16 : 12} />
          </button>
        </div>

        {/* Bottom Metadata - Re-aligned & Compressed */}
        <div className="absolute bottom-0 inset-x-0 p-2 pb-2.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none">
          <h4 className="text-[10px] font-bold text-white truncate max-w-full drop-shadow-md leading-tight mb-0.5">
            {media.fileName}
          </h4>
          <div className="flex items-center gap-2 text-[8px] font-bold text-white/70 uppercase tracking-tighter">
            <span>{format(new Date(media.uploadedAt), 'MMM d')}</span>
            <span className="opacity-30">•</span>
            <span>{formatSize(media.size)}</span>
          </div>
        </div>
      </div>

      {/* Quiet Video Badge (Visible when NOT hovering) */}
      {isVideo && (
        <div className="absolute top-3 right-3 z-10 group-hover:hidden flex items-center justify-center h-6 w-6 rounded-full bg-black/30 backdrop-blur-sm text-white border border-white/10">
          <Video size={10} />
        </div>
      )}
    </motion.div>
  );
}
