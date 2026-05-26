import { useState, useEffect, useMemo, useRef } from 'react';
import { formatDistanceToNow, parseISO, format, isToday, isYesterday } from 'date-fns';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { FileText, Trash2, RotateCcw, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Trash() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{ note: any; x: number; y: number } | null>(null);
  
  const storageKey = user ? `keep-in-mind-notes-${user._id}` : 'keep-in-mind-notes-guest';

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  // Persist notes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes, storageKey]);

  // Filter trashed notes
  const trashedNotes = useMemo(() => {
    const result = notes.filter((note: any) => {
      if (!note.trashed) return false;
      const matchesSearch = !searchQuery || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
    return result.sort((a: any, b: any) => b.id - a.id);
  }, [notes, searchQuery]);

  const handleRestore = (noteId: number) => {
    setNotes(notes.map((n: any) => n.id === noteId ? { ...n, trashed: false } : n));
    setContextMenu(null);
  };

  const handleDeletePermanently = (noteId: number) => {
    setNotes(notes.filter((n: any) => n.id !== noteId));
    setContextMenu(null);
  };

  const handleEmptyTrash = () => {
    if (window.confirm('Are you sure you want to permanently delete all items in Trash?')) {
      setNotes(notes.filter((n: any) => !n.trashed));
    }
  };

  const getNote3DIcon = (note: any) => {
    const title = note.title.toLowerCase();
    if (title.includes('shop') || title.includes('grocery') || title.includes('list')) {
      return '/shopping-3d.png';
    }
    if (title.includes('thought') || title.includes('idea')) {
      return '/thoughts-3d.png';
    }
    return '/lightbulb-3d.png';
  };

  const getNoteIconBg = (note: any) => {
    const title = note.title.toLowerCase();
    if (title.includes('shop') || title.includes('grocery') || title.includes('list')) {
      return 'bg-[#FFF0EB] dark:bg-orange-950/20';
    }
    if (title.includes('thought') || title.includes('idea')) {
      return 'bg-[#FFF9EA] dark:bg-yellow-950/20';
    }
    return 'bg-[#FFF9EA] dark:bg-yellow-950/20';
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  const startPress = (e: any, note: any) => {
    isLongPressTriggered.current = false;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spawnX = rect.left;
    const spawnY = Math.min(rect.bottom + 4, window.innerHeight - 200);
    
    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      setContextMenu({ note, x: spawnX, y: spawnY });
      timerRef.current = null;
    }, 500);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleNoteClick = (e: any, note: any) => {
    if (isLongPressTriggered.current) {
      e.preventDefault();
      isLongPressTriggered.current = false;
      return;
    }
    // Trashed notes are read-only, open context menu on click
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ note, x: rect.left, y: Math.min(rect.bottom + 4, window.innerHeight - 200) });
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pb-28 pt-2">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Trash2 className="text-red-500" /> Trash
        </h2>
        {trashedNotes.length > 0 && (
          <button 
            onClick={handleEmptyTrash}
            className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
          >
            Empty Trash
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {trashedNotes.map((note: any) => {
            const isList = note.type === 'list';
            let previewText = note.content || '';
            if (isList && note.content) {
              try {
                const parsed = JSON.parse(note.content);
                previewText = parsed.map((p: any) => p.text).join(', ');
              } catch {
                previewText = note.content.replace(/^-\s*/gm, '').replace(/\n/g, ', ');
              }
            }

            return (
              <motion.div
                layoutId={`note-${note.id}`}
                key={note.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={(e: any) => handleNoteClick(e, note)}
                onMouseDown={(e: any) => startPress(e, note)}
                onMouseUp={cancelPress}
                onMouseLeave={cancelPress}
                onTouchStart={(e: any) => startPress(e, note)}
                onTouchEnd={cancelPress}
                onTouchMove={cancelPress}
                onContextMenu={(e: any) => {
                  e.preventDefault();
                  if (!isLongPressTriggered.current) {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setContextMenu({ note, x: rect.left, y: Math.min(rect.bottom + 4, window.innerHeight - 200) });
                    isLongPressTriggered.current = true;
                  }
                }}
                className="bg-white dark:bg-[#1A1C20] rounded-[22px] p-4 shadow-sm border border-black/5 dark:border-white/5 hover:shadow-md transition-all duration-300 flex items-center gap-4 cursor-pointer relative group opacity-70"
              >
                <div className={cn("w-[50px] h-[50px] rounded-[18px] flex items-center justify-center shrink-0 overflow-hidden", getNoteIconBg(note))}>
                  <img src={getNote3DIcon(note)} alt="Icon" className="w-[36px] h-[36px] object-contain mix-blend-multiply dark:mix-blend-normal grayscale" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 truncate pr-4 mb-1">
                    {note.title}
                  </h4>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 line-clamp-2 pr-6">
                    {previewText ? previewText.replace(/<[^>]*>?/gm, '') : ''}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight whitespace-nowrap">
                    {(() => {
                      try {
                        const date = parseISO(note.date);
                        if (isNaN(date.getTime())) return note.date;
                        if (isToday(date)) return format(date, 'h:mm a');
                        if (isYesterday(date)) return 'Yesterday';
                        return format(date, 'MMM d');
                      } catch {
                        return note.date;
                      }
                    })()}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {trashedNotes.length === 0 && (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={30} className="text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Trash is empty</h4>
            <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
              Items in trash will be permanently deleted after 30 days.
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {contextMenu && (
          <TrashContextMenu
            note={contextMenu.note}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={() => setContextMenu(null)}
            onRestore={() => handleRestore(contextMenu.note.id)}
            onDelete={() => handleDeletePermanently(contextMenu.note.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TrashContextMenu({
  note, position, onClose, onRestore, onDelete
}: {
  note: any;
  position: { x: number; y: number };
  onClose: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const adjustedX = Math.min(position.x, window.innerWidth - 220);
  const adjustedY = Math.min(position.y, window.innerHeight - 150);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[200] w-44 bg-surface-container-lowest rounded-xl shadow-2xl border border-on-surface/10 transition-colors"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <button
        onClick={onRestore}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-on-surface/5 transition-colors text-left text-on-surface"
      >
        <RotateCcw size={14} className="text-on-surface-variant" />
        <span className="text-xs font-semibold">Restore</span>
      </button>
      
      <div className="h-px bg-on-surface/8 mx-3 my-1" />

      <button
        onClick={onDelete}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-on-surface/5 transition-colors text-left text-red-500"
      >
        <XCircle size={14} className="text-red-500" />
        <span className="text-xs font-semibold">Delete Permanently</span>
      </button>
    </motion.div>
  );
}
