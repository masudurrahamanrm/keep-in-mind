import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Plus, CheckSquare, Settings2, MoreHorizontal, Search, FileText, PenLine, Pin, Tag, Mic, Star, Menu, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { syncNotesToGoogleDrive } from '../services/driveService';
import SpeedDial from '../components/SpeedDial';
import NoteContextMenu from '../components/NoteContextMenu';

const initialNotes = [
  {
    id: 1,
    title: 'Daily Goals',
    content: JSON.stringify([
      { id: 1, text: 'Drink water', checked: true },
      { id: 2, text: '30 mins workout', checked: true },
      { id: 3, text: 'Read 10 pages', checked: false }
    ]),
    color: 'bg-white',
    textColor: 'text-[#FFC107]',
    date: new Date(Date.now() - 3600000).toISOString(),
    type: 'list',
    category: 'Personal',
    pinned: true
  },
  {
    id: 2,
    title: 'Project Ideas',
    content: 'Design a new onboarding flow for KeepInMind app.',
    color: 'bg-white',
    textColor: 'text-[#FFC107]',
    date: new Date(Date.now() - 86400000).toISOString(),
    type: 'text',
    category: 'Work',
    pinned: false
  },
  {
    id: 3,
    title: 'Thoughts',
    content: 'Discipline is the bridge between goals and accomplishment.',
    color: 'bg-white',
    textColor: 'text-[#FFC107]',
    date: new Date(Date.now() - 172800000).toISOString(),
    type: 'text',
    category: 'Ideas',
    pinned: false
  },
  {
    id: 4,
    title: 'Shopping List',
    content: JSON.stringify([
      { id: 1, text: 'Milk, Eggs, Bread', checked: false },
      { id: 2, text: 'Butter, Fruits, Honey', checked: false }
    ]),
    color: 'bg-white',
    textColor: 'text-[#FFC107]',
    date: new Date(Date.now() - 604800000).toISOString(),
    type: 'list',
    category: 'Personal',
    pinned: false
  }
];

export default function Notes() {
  const { user, token, googleAccessToken } = useAuth();
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{ note: any; x: number; y: number } | null>(null);
  
  const storageKey = user ? `keep-in-mind-notes-${user._id}` : 'keep-in-mind-notes-guest';

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : initialNotes;
  });

  // Auto-Sync to Google Drive
  useEffect(() => {
    const isAutoSyncEnabled = localStorage.getItem('keep-in-mind-auto-sync') === 'true';
    if (!isAutoSyncEnabled || !user || !token || !googleAccessToken) return;

    const syncTimeout = setTimeout(async () => {
      try {
        const syncableNotes = notes;
        if (syncableNotes.length === 0) return;
        console.log('🔄 Auto-syncing to Google Drive...');
        await syncNotesToGoogleDrive(syncableNotes, googleAccessToken, token);
        
        const now = new Date().toLocaleString();
        localStorage.setItem(`keep-in-mind-last-sync-${user._id}`, now);
      } catch (err) {
        console.error('Auto-sync failed:', err);
      }
    }, 3000);

    return () => clearTimeout(syncTimeout);
  }, [notes, user, token, googleAccessToken]);

  const [filterActive, setFilterActive] = useState('All');
  const { searchQuery } = useOutletContext<{ searchQuery: string }>();

  // Persist notes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes, storageKey]);

  const filters = ['All', ...(() => {
    const saved = localStorage.getItem('keep-in-mind-labels');
    return saved ? JSON.parse(saved) : ['Personal', 'Work', 'Ideas', 'Urgent'];
  })()];

  // Separate pinned and unpinned notes
  const { pinnedNotes, allNotes } = useMemo(() => {
    const result = notes.filter(note => {
      if (note.archived) return false;
      const matchesSearch = !searchQuery || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterActive === 'All' || note.category === filterActive;
      return matchesSearch && matchesFilter;
    });

    return {
      pinnedNotes: result.filter(n => n.pinned),
      allNotes: result.filter(n => !n.pinned).sort((a, b) => b.id - a.id)
    };
  }, [notes, searchQuery, filterActive]);

  const handleSaveNote = (savedNote: any) => {
    if (savedNote.isNew || !savedNote.id) {
      setNotes([{
        ...savedNote,
        id: Date.now(),
        isNew: false,
        date: new Date().toISOString(),
        type: savedNote.type || 'text'
      }, ...notes]);
    } else {
      setNotes(notes.map(n => n.id === savedNote.id ? savedNote : n));
    }
  };

  const handleDeleteNote = (noteId: number) => {
    setNotes(notes.filter(n => n.id !== noteId));
    setContextMenu(null);
  };

  const handleDuplicate = (note: any) => {
    const copy = { ...note, id: Date.now(), title: `${note.title} (copy)`, date: new Date().toISOString() };
    setNotes(prev => [copy, ...prev]);
    setContextMenu(null);
  };

  const handlePin = (note: any) => {
    const updated = { ...note, pinned: !note.pinned };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    setContextMenu(null);
  };

  const handleAddLabel = (note: any, label: string) => {
    const updated = { ...note, category: label };
    setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
  };

  const handleArchive = (note: any) => {
    const nowArchived = !note.archived;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, archived: nowArchived } : n));
    setContextMenu(null);
  };

  const base64ToFile = async (base64Data: string, filename: string) => {
    try {
      const res = await fetch(base64Data);
      const blob = await res.blob();
      return new File([blob], filename, { type: 'image/png' });
    } catch (e) {
      return null;
    }
  };

  const handleShare = async (note: any) => {
    setContextMenu(null);
    const categoryText = note.category ? `[${note.category}] ` : '';
    const shareText = `${categoryText}${note.title}\n\n${note.content || ''}`;
    
    try {
      if (!note.type || note.type === 'text' || note.type === 'list') {
        await navigator.clipboard.writeText(shareText);
      }

      const shareData: any = { title: note.title, text: shareText, url: window.location.href };

      if (note.type === 'drawing' && note.content?.startsWith('data:')) {
        const file = await base64ToFile(note.content, `${note.title || 'drawing'}.png`);
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
          shareData.text = note.title ? `${categoryText}${note.title}` : 'Shared drawing';
        }
      }

      if (navigator.share) {
        await navigator.share(shareData);
      }
    } catch (err) { 
      console.log('Share interaction completed'); 
    }
  };

  const openNoteForEdit = (note: any) => {
    setContextMenu(null);
    if (note.type === 'drawing') navigate(`/drawing/${note.id}`);
    else navigate(`/editor/${note.id}`);
  };

  // Icon mapping helper based on note title and category
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
      return 'bg-[#FFF0EB] dark:bg-orange-950/20'; // light orange
    }
    if (title.includes('thought') || title.includes('idea')) {
      return 'bg-[#FFF9EA] dark:bg-yellow-950/20'; // light yellow
    }
    return 'bg-[#FFF9EA] dark:bg-yellow-950/20';
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pb-28 pt-2">
      
      {/* 1. GREETING BANNER CARD */}
      <div className="w-full bg-[#FEF7D6] dark:from-[#2C2415] dark:to-[#42361C] rounded-[28px] p-6 mb-6 relative overflow-hidden shadow-sm shrink-0" style={{height:'144px'}}>
        <div className="relative z-10 w-2/3">
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-amber-100 leading-tight mb-1">
            Good Morning, 👋
          </h2>
          <p className="text-sm text-gray-600 dark:text-amber-200/80">
            What are your thoughts today?
          </p>
        </div>
        {/* Decorative glow */}
        <div className="absolute right-[-10px] bottom-[-20px] w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl pointer-events-none" />
        {/* 3D Lightbulb */}
        <div className="absolute right-0 bottom-0 w-32 h-full flex items-end justify-center pr-2 pb-2">
          <img src="/lightbulb-3d.png" alt="Lightbulb" className="h-24 w-auto object-contain drop-shadow-md" />
        </div>
      </div>

      {/* 2. PINNED NOTES SECTION */}
      {pinnedNotes.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4 px-1">
            <div className="flex items-center gap-2">
              <Pin size={14} className="text-[#FBBF24]" fill="#FBBF24" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pinned Notes</h3>
            </div>
            <button className="text-xs font-medium text-[#FBBF24] hover:text-[#F5B000] transition-colors">
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pinnedNotes.map((note) => {
              const isList = note.type === 'list';
              let listItems: any[] = [];
              if (isList && note.content) {
                try {
                  listItems = JSON.parse(note.content);
                } catch {
                  listItems = note.content.split('\n').filter(Boolean).map((t, i) => ({ id: i, text: t.replace(/^-\s*/, ''), checked: false }));
                }
              }

              return (
                <div
                  key={note.id}
                  onClick={() => openNoteForEdit(note)}
                  className="bg-[#FFF9EA] dark:bg-yellow-950/20 rounded-[24px] p-5 shadow-sm border border-black/5 dark:border-white/5 hover:shadow-md transition-all duration-300 relative flex justify-between items-start cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-black text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
                        {note.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePin(note);
                        }}
                        className="p-1 text-[#FFC107] rounded-full transition-colors"
                      >
                        <Pin size={18} className="fill-[#FFC107]" />
                      </button>
                    </div>

                    {isList ? (
                      <div className="space-y-2">
                        {listItems.slice(0, 3).map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-semibold">
                            <div className={cn(
                              "w-[15px] h-[15px] rounded border shrink-0 flex items-center justify-center transition-all",
                              item.checked ? "border-[#FFC107] bg-[#FFC107]/15" : "border-gray-300 dark:border-white/20"
                            )}>
                              {item.checked && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFC107" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                            <span className={cn("truncate", item.checked && "line-through opacity-50")}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold line-clamp-3">
                        {note.content}
                      </p>
                    )}
                  </div>

                  {/* clipboard 3D image on right side */}
                  <div className="w-[84px] h-[84px] shrink-0 flex items-center justify-center">
                    <img src="/clipboard-3d.png" alt="Clipboard" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ALL NOTES SECTION */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">All Notes</h3>
          </div>
          <button className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
            Recent <ChevronDown size={12} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {allNotes.map((note) => {
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
                  onClick={() => openNoteForEdit(note)}
                  className="bg-white dark:bg-[#1A1C20] rounded-[22px] p-4 shadow-sm border border-black/5 dark:border-white/5 hover:shadow-md transition-all duration-300 flex items-center gap-4 cursor-pointer relative group"
                >
                  {/* Left 3D icon wrapper */}
                  <div className={cn("w-[50px] h-[50px] rounded-[18px] flex items-center justify-center shrink-0 overflow-hidden", getNoteIconBg(note))}>
                    <img src={getNote3DIcon(note)} alt="Icon" className="w-[36px] h-[36px] object-contain mix-blend-multiply dark:mix-blend-normal" />
                  </div>

                  {/* Middle Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 truncate pr-4">
                        {note.title}
                      </h4>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight whitespace-nowrap">
                        {(() => {
                          try {
                            const date = parseISO(note.date);
                            if (isNaN(date.getTime())) return note.date;
                            return formatDistanceToNow(date, { addSuffix: false }).replace('about', '') + ' ago';
                          } catch {
                            return note.date;
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate pr-6">
                      {previewText}
                    </p>
                  </div>

                  {/* Right Star Outline / context menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePin(note);
                      }}
                      className="p-1.5 text-gray-300 hover:text-[#FFC107] rounded-full transition-colors"
                      title={note.pinned ? "Unpin Note" : "Pin Note"}
                    >
                      <Star size={16} className={cn(note.pinned ? "fill-[#FFC107] text-[#FFC107]" : "text-gray-300 dark:text-gray-600")} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setContextMenu({ note, x: rect.left, y: rect.bottom + 4 });
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {allNotes.length === 0 && PinnedNotesCount(pinnedNotes) === 0 && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <FileText size={30} className="text-gray-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">It's empty here</h4>
              <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
                Create your first note by clicking the button below.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) matching the mockup */}
      <button
        onClick={() => navigate('/editor')}
        className="fixed bottom-24 right-5 w-[60px] h-[60px] rounded-full bg-[#FFC107] hover:bg-[#F5B000] text-white flex items-center justify-center shadow-lg shadow-[#FFC107]/25 active:scale-95 transition-all z-40"
        title="Add Note"
      >
        <Plus size={30} strokeWidth={2.5} />
      </button>

      {/* Note Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <NoteContextMenu
            note={contextMenu.note}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            labels={filters.filter(f => f !== 'All')}
            onClose={() => setContextMenu(null)}
            onEdit={() => openNoteForEdit(contextMenu.note)}
            onDelete={() => handleDeleteNote(contextMenu.note.id)}
            onDuplicate={() => handleDuplicate(contextMenu.note)}
            onArchive={() => handleArchive(contextMenu.note)}
            onPin={() => handlePin(contextMenu.note)}
            onAddLabel={(label) => handleAddLabel(contextMenu.note, label)}
            onShare={() => handleShare(contextMenu.note)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to count pinned notes safely
function PinnedNotesCount(arr: any[]) {
  return arr.length;
}
