import React from 'react';
import { motion } from 'motion/react';
import { FileText, MoreVertical, Trash2, Pencil, Share2, Download, Image as ImageIcon, Video } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentListCardProps {
  media: any;
  onSelect: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, currentName: string) => void;
  streamEndpoint?: string;
}

export default function DocumentListCard({ media, onSelect, onDelete, onRename }: DocumentListCardProps) {
  const isVideo = media.fileType?.startsWith('video/') || media.fileName?.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/);
  const isPdf = media.fileType?.includes('pdf') || media.fileName?.toLowerCase().endsWith('.pdf');
  const isImage = media.fileType?.startsWith('image/') || media.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: media.fileName,
        url: media.fileUrl
      }).catch(console.error);
    } else {
      // Fallback: Copy to clipboard or open link
      navigator.clipboard.writeText(media.fileUrl);
      alert('Link copied to clipboard!');
    }
  };

  const getIcon = () => {
    if (isPdf) return <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0"><span className="text-[10px] font-black tracking-tighter uppercase">PDF</span></div>;
    if (isVideo) return <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0"><Video size={20} /></div>;
    if (isImage) return <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><ImageIcon size={20} /></div>;
    return <div className="w-10 h-10 rounded-xl bg-neutral-500/10 text-neutral-500 flex items-center justify-center shrink-0"><FileText size={20} /></div>;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onSelect}
      className="group relative flex items-center gap-4 p-3 bg-white dark:bg-[#1C1C1E] hover:bg-neutral-50 dark:hover:bg-[#2C2C2E] rounded-2xl cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-200"
    >
      {/* Icon */}
      {getIcon()}

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate mb-0.5">
          {media.fileName}
        </h4>
        <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
          <span>Modified {format(new Date(media.uploadedAt), 'h:mm a')}</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
          <span>{formatSize(media.size)}</span>
        </div>
      </div>

      {/* Actions (Hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleShare}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-primary transition-colors"
          title="Share"
        >
          <Share2 size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRename(media._id, media.fileName); }}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors"
          title="Rename"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(media._id); }}
          className="p-2 hover:bg-error/10 rounded-full text-error transition-colors"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Mobile More Button (always visible on touch devices if hover isn't supported, though Tailwind group-hover handles most. For safety, just let it be hover-based for now) */}
    </motion.div>
  );
}
