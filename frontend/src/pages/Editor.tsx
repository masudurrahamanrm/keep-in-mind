import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Bold, Italic, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon, 
  Palette, Tag, Pin, Archive, Trash2, CheckCircle2, Cloud,
  Plus, Camera, PenTool, Table as TableIcon, FileText, ScanLine, X,
  Undo2, Redo2, Share2, MoreVertical, Wand2, Mic, CheckSquare, Type as FormatIcon,
  ChevronDown, Play, Square, Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Node, mergeAttributes } from '@tiptap/core';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

const Audio = Node.create({
  name: 'audio',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      class: { default: 'w-full my-4 rounded-xl bg-surface-container' },
    };
  },

  parseHTML() {
    return [{ tag: 'audio' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes(HTMLAttributes)];
  },
});

import { cn } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const COLORS = [
  { name: 'Default', value: 'bg-surface', text: 'text-on-surface' },
  { name: 'Rose', value: 'bg-error/10 border-error/20', text: 'text-error' },
  { name: 'Amber', value: 'bg-primary/10 border-primary/20', text: 'text-primary' },
  { name: 'Emerald', value: 'bg-tertiary/10 border-tertiary/20', text: 'text-tertiary' },
  { name: 'Sky', value: 'bg-secondary/10 border-secondary/20', text: 'text-secondary' },
  { name: 'Violet', value: 'bg-indigo-500/10 border-indigo-500/20', text: 'text-indigo-400' },
];

export default function Editor() {
  const { id: paramId } = useParams();
  const [currentId, setCurrentId] = useState<string | number | undefined>(paramId);
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const storageKey = user ? `keep-in-mind-notes-${user._id}` : 'keep-in-mind-notes-guest';
  const labelKey = 'keep-in-mind-labels';
  
  const CATEGORIES = (() => {
    const saved = localStorage.getItem(labelKey);
    return saved ? JSON.parse(saved) : ['Personal', 'Work', 'Ideas', 'Urgent'];
  })();

  const [title, setTitle] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [category, setCategory] = useState('Personal');
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [showPalette, setShowPalette] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [openAddPanel, setOpenAddPanel] = useState(false);
  const [showFormatPanel, setShowFormatPanel] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    // Dismiss keyboard when any panel opens
    if (openAddPanel || showFormatPanel || showVoicePanel || showPalette || showCategories) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [openAddPanel, showFormatPanel, showVoicePanel, showPalette, showCategories]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => {
      const viewportHeight = window.visualViewport!.height;
      const fullHeight = window.innerHeight;
      const heightDiff = fullHeight - viewportHeight;
      if (heightDiff > 100) {
        setKeyboardHeight(heightDiff);
      } else {
        setKeyboardHeight(0);
      }
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => (prev < 300 ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // ── Tiptap Editor Initialization ──
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Underline is added by StarterKit in TipTap v3 — don't add it separately
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Take a note...',
      }),
      Audio,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none max-w-none text-on-surface/90 min-h-[300px] [&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:p-0 [&_li[data-checked="true"]]:line-through [&_li[data-checked="true"]]:opacity-50',
      },
    },
  });

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  // Load existing note
  useEffect(() => {
    const loadNote = async () => {
      if (currentId) {
        if (token) {
          try {
            const res = await fetch(`${API_BASE}/notes/${currentId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              const existingNote = await res.json();
              setTitle(existingNote.title || '');
              if (editor) {
                editor.commands.setContent(existingNote.content || '');
              }
              const matchedColor = COLORS.find(c => c.value === existingNote.color) || COLORS[0];
              setColor(matchedColor);
              setCategory(existingNote.category || 'Personal');
              setIsPinned(existingNote.pinned || false);
              setIsArchived(existingNote.archived || false);
            } else {
              navigate('/notes');
            }
          } catch (error) {
            console.error('Error fetching note:', error);
            navigate('/notes');
          }
        } else {
          // Guest mode fallback
          const savedNotes = JSON.parse(localStorage.getItem(storageKey) || '[]');
          const existingNote = savedNotes.find((n: any) => n.id === parseInt(currentId as string) || n.id === currentId);
          if (existingNote) {
            setTitle(existingNote.title || '');
            if (editor) {
              editor.commands.setContent(existingNote.content || '');
            }
            const matchedColor = COLORS.find(c => c.value === existingNote.color) || COLORS[0];
            setColor(matchedColor);
            setCategory(existingNote.category || 'Personal');
            setIsPinned(existingNote.pinned || false);
            setIsArchived(existingNote.archived || false);
          } else {
            navigate('/notes');
          }
        }
      }
    };
    
    if (editor && currentId) {
      loadNote();
    }
  }, [currentId, storageKey, navigate, editor, token]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const content = editor.getHTML();
    if (!title && (content === '<p></p>' || !content)) return;
    
    setIsSaving(true);
    const now = new Date();
    
    const noteData = {
      title,
      content: content,
      color: color.value,
      textColor: color.text,
      category,
      pinned: isPinned,
      archived: isArchived,
      date: now.toISOString(),
      type: 'text'
    };

    if (token) {
      try {
        if (currentId) {
          await fetch(`${API_BASE}/notes/${currentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(noteData)
          });
        } else {
          const res = await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(noteData)
          });
          if (res.ok) {
            const newNote = await res.json();
            setCurrentId(newNote._id);
            window.history.replaceState(null, '', `/editor/${newNote._id}`);
          } else {
            const errBody = await res.json().catch(() => ({}));
            console.error('Save note failed:', res.status, errBody);
          }
        }
      } catch (error) {
        console.error('Error saving note:', error);
      }
    } else {
      // Guest mode fallback
      const savedNotes = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const noteId = currentId ? (typeof currentId === 'string' && !isNaN(parseInt(currentId)) ? parseInt(currentId) : currentId) : Date.now();
      const localNoteData = { ...noteData, id: noteId };
      
      let updatedNotes;
      if (currentId) {
        updatedNotes = savedNotes.map((n: any) => n.id === noteId ? localNoteData : n);
      } else {
        updatedNotes = [localNoteData, ...savedNotes];
        setCurrentId(noteId);
        window.history.replaceState(null, '', `/editor/${noteId}`);
      }
      localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
    }

    setIsSaving(false);
    setLastSaved(now);
  }, [title, editor, color, category, isPinned, isArchived, currentId, storageKey, token]);

  // Debounced auto-save for typical content (Tiptap)
  useEffect(() => {
    if (!editor) return;
    
    let timeout: ReturnType<typeof setTimeout>;
    const handleUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleSave();
      }, 1000);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      clearTimeout(timeout);
    };
  }, [editor, handleSave]);

  // Debounced auto-save for Title and Metadata
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title) handleSave();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [title, color, category, isPinned, isArchived, handleSave]);

  if (!editor && paramId) return null;

  return (
    <div className={cn(
      "min-h-[100dvh] pb-24 flex flex-col transition-colors duration-500 ease-in-out relative",
      color.value
    )}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 backdrop-blur-xl bg-white/10 border-b border-on-surface/5">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => {
              handleSave();
              navigate(-1);
            }}
            className="p-2 hover:bg-on-surface/5 rounded-full transition-all active:scale-90"
            title="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex items-center gap-0.5 ml-2 md:ml-4">
            <button 
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className="p-2 hover:bg-on-surface/5 rounded-full transition-all disabled:opacity-20 active:scale-90"
              title="Undo"
            >
              <Undo2 size={22} />
            </button>
            <button 
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className="p-2 hover:bg-on-surface/5 rounded-full transition-all disabled:opacity-20 active:scale-90"
              title="Redo"
            >
              <Redo2 size={22} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: title || 'Keep In Mind Note',
                  text: editor?.getText() || '',
                }).catch(() => {});
              }
            }}
            className="p-2 hover:bg-on-surface/5 rounded-full transition-all active:scale-90"
            title="Share"
          >
            <Share2 size={22} />
          </button>
          
          <button 
            className="p-2 hover:bg-on-surface/5 rounded-full transition-all active:scale-90"
            title="More options"
          >
            <MoreVertical size={22} />
          </button>

          <button 
            onClick={() => {
              handleSave();
              navigate('/notes');
            }}
            className="px-5 py-2 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/30 hover:scale-105 transition-all active:scale-95 ml-2"
          >
            Done
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          className="text-4xl md:text-5xl font-heading font-black bg-transparent border-none outline-none placeholder:opacity-20 mb-8 w-full tracking-tight text-on-surface"
          autoFocus={!currentId}
        />
        
        <div className="flex-1">
          <EditorContent editor={editor} />
        </div>
      </main>

      {/* ── Toolbar ── */}
      <div 
        className={cn(
          "fixed left-0 w-full z-40 flex justify-center pointer-events-none transition-all duration-300 ease-out",
          keyboardHeight > 0 ? "px-0" : "p-4 md:p-6"
        )}
        style={{ 
          bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : `env(safe-area-inset-bottom, 0px)`
        }}
      >
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "flex items-center gap-1 backdrop-blur-xl bg-surface/90 border border-on-surface/10 shadow-2xl pointer-events-auto transition-all duration-300",
            keyboardHeight > 0 
              ? "w-full rounded-none px-4 py-1 border-x-0 border-b-0" // Flush bar look when typing
              : "p-1 md:p-1.5 rounded-[2rem]" // Floating capsule look normally
          )}
        >
          {/* Background/Theme */}
          <button 
            onClick={() => {
              setShowPalette(!showPalette);
              setShowCategories(false);
              setShowFormatPanel(false);
              setShowVoicePanel(false);
            }}
            className={cn("p-3 rounded-full transition-all", showPalette ? "text-primary bg-primary/10" : "hover:bg-on-surface/5")}
            title="Theme"
          >
            <Wand2 size={20} />
          </button>

          {/* Drawing */}
          <button 
            onClick={() => {
              handleSave();
              navigate(`/drawing/${currentId || 'new'}`);
            }}
            className="p-3 hover:bg-on-surface/5 rounded-full transition-all"
            title="Drawing"
          >
            <PenTool size={20} />
          </button>

          {/* Checklist */}
          <button 
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            className={cn("p-3 rounded-full transition-all", editor?.isActive('taskList') ? "text-primary bg-primary/10" : "hover:bg-on-surface/5")}
            title="Checklist"
          >
            <CheckSquare size={20} />
          </button>

          {/* Format Panel Toggle */}
          <button 
            onClick={() => {
              setShowFormatPanel(!showFormatPanel);
              setOpenAddPanel(false);
              setShowPalette(false);
              setShowVoicePanel(false);
            }}
            className={cn("p-3 rounded-full transition-all", showFormatPanel ? "text-primary bg-primary/10 font-black" : "hover:bg-on-surface/5")}
            title="Format"
          >
            <FormatIcon size={20} />
          </button>

          {/* Voice Panel Toggle */}
          <button 
            onClick={() => {
              setShowVoicePanel(!showVoicePanel);
              setOpenAddPanel(false);
              setShowPalette(false);
              setShowFormatPanel(false);
            }}
            className={cn("p-3 rounded-full transition-all", showVoicePanel ? "text-primary bg-primary/10" : "hover:bg-on-surface/5")}
            title="Voice"
          >
            <Mic size={20} />
          </button>

          {/* Add Content Panel Toggle */}
          <button 
            onClick={() => {
              setOpenAddPanel(!openAddPanel);
              setShowFormatPanel(false);
              setShowPalette(false);
              setShowVoicePanel(false);
            }}
            className={cn("p-3 rounded-full transition-all", openAddPanel ? "text-primary bg-primary/10" : "hover:bg-on-surface/5")}
            title="Add"
          >
            <Plus size={20} />
          </button>
        </motion.div>
      </div>

      {/* ── Add Content Panel (Bottom Sheet) ── */}
      <AnimatePresence>
        {openAddPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenAddPanel(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-[2.5rem] shadow-2xl p-6 pb-12 md:max-w-md md:mx-auto border-t border-outline-variant/10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase tracking-widest text-on-surface/40">Add</h2>
                <button 
                  onClick={() => setOpenAddPanel(false)}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                {[
                  { 
                    icon: <ImageIcon size={22} />, 
                    label: "Photos", 
                    action: () => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            editor?.chain().focus().setImage({ src: re.target?.result as string }).run();
                            handleSave();
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    } 
                  },
                  { 
                    icon: <Camera size={22} />, 
                    label: "Camera", 
                    action: () => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment' as any;
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            editor?.chain().focus().setImage({ src: re.target?.result as string }).run();
                            handleSave();
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    } 
                  },
                  { icon: <PenTool size={22} />, label: "Doodle", action: () => {
                    handleSave();
                    navigate(`/drawing/${currentId || 'new'}`);
                  }},
                  { 
                    icon: <TableIcon size={22} />, 
                    label: "Spreadsheet", 
                    action: () => {
                      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    } 
                  },
                  { 
                    icon: <FileText size={22} />, 
                    label: "Files", 
                    action: () => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          editor?.chain().focus().insertContent(`<p><a href="#" class="file-attachment text-primary underline">📁 ${file.name}</a></p>`).run();
                          handleSave();
                        }
                      };
                      input.click();
                    } 
                  },
                  { 
                    icon: <ScanLine size={22} />, 
                    label: "Scan doc", 
                    action: () => {
                      // Stub same as camera for web demo
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment' as any;
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            editor?.chain().focus().setImage({ src: re.target?.result as string }).run();
                            handleSave();
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    } 
                  },
                ].map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      item.action();
                      setOpenAddPanel(false);
                    }}
                    className="flex flex-col items-center gap-3 group transition-all"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-on-surface/5 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary">
                      {item.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-40 group-hover:opacity-100 transition-all text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Format Panel (Bottom Sheet) ── */}
      <AnimatePresence>
        {showFormatPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormatPanel(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
            />
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-[2.5rem] shadow-2xl p-6 pb-12 md:max-w-md md:mx-auto border-t border-outline-variant/10"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-on-surface/40">Format</h2>
                <button 
                  onClick={() => setShowFormatPanel(false)}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Typography */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-6 border-b border-on-surface/5 mb-6">
                {[
                  { label: 'Title', command: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive('heading', { level: 1 }) },
                  { label: 'Subtitle', command: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
                  { label: 'Heading', command: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive('heading', { level: 3 }) },
                  { label: 'Body', command: () => editor?.chain().focus().setParagraph().run(), active: editor?.isActive('paragraph') },
                  { label: 'Note', command: () => editor?.chain().focus().setParagraph().run(), active: false }, // Small text stub
                ].map((type) => (
                  <button
                    key={type.label}
                    onClick={type.command}
                    className={cn(
                      "px-5 py-2.5 rounded-2xl whitespace-nowrap transition-all font-black uppercase tracking-tighter text-xs",
                      type.active ? "bg-primary/10 text-primary" : "bg-on-surface/5 text-on-surface/40 hover:bg-on-surface/10"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Styles Grid */}
              <div className="grid grid-cols-6 gap-2 mb-2">
                {[
                  { icon: <Bold size={18} />, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive('bold') },
                  { icon: <Italic size={18} />, action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive('italic') },
                  { icon: <span className="text-lg font-serif line-through">S</span>, action: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive('strike') },
                  { icon: <span className="text-sm font-bold border-b-4 border-primary">A</span>, action: () => {}, active: false },
                  { icon: <span className="text-sm font-bold text-primary">A</span>, action: () => {}, active: false },
                  { icon: <span className="text-sm font-bold bg-primary/20 p-0.5 rounded">A</span>, action: () => editor?.chain().focus().toggleHighlight().run(), active: editor?.isActive('highlight') },
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={s.action}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-xl transition-all",
                      s.active ? "bg-primary/10 text-primary shadow-inner" : "bg-on-surface/5 text-on-surface/60 hover:bg-on-surface/10"
                    )}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>

              {/* Layout Grid */}
              <div className="grid grid-cols-6 gap-2 mb-6">
                {[
                  { icon: <List size={18} />, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive('bulletList') },
                  { icon: <ListOrdered size={18} />, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive('orderedList') },
                  { icon: <AlignLeft size={18} />, action: () => editor?.chain().focus().setTextAlign('left').run(), active: editor?.isActive({ textAlign: 'left' }) },
                  { icon: <AlignCenter size={18} />, action: () => editor?.chain().focus().setTextAlign('center').run(), active: editor?.isActive({ textAlign: 'center' }) },
                  { icon: <AlignRight size={18} />, action: () => editor?.chain().focus().setTextAlign('right').run(), active: editor?.isActive({ textAlign: 'right' }) },
                  { icon: <span className="text-lg font-black tracking-tighter">≡</span>, action: () => {}, active: false },
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={s.action}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-xl transition-all",
                      s.active ? "bg-primary/10 text-primary shadow-inner" : "bg-on-surface/5 text-on-surface/60 hover:bg-on-surface/10"
                    )}
                  >
                    {s.icon}
                  </button>
                ))}
              </div>

              {/* Font & Size Row */}
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-3 bg-on-surface/5 rounded-2xl flex items-center justify-between text-on-surface/60 group hover:bg-on-surface/10 transition-all font-black uppercase tracking-tighter text-[11px]">
                  <span>System font</span>
                  <ChevronDown size={16} className="opacity-40 group-hover:opacity-100" />
                </button>
                <button className="w-20 px-4 py-3 bg-on-surface/5 rounded-2xl flex items-center justify-center text-on-surface/60 hover:bg-on-surface/10 transition-all font-black uppercase tracking-tighter text-[11px]">
                  16
                </button>
                <button className="aspect-square w-[44px] bg-on-surface font-black text-white rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 via-emerald-400 to-amber-300" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Voice Panel (Bottom Sheet) ── */}
      <AnimatePresence>
        {showVoicePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoicePanel(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
            />
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-[2.5rem] shadow-2xl p-8 pb-12 md:max-w-md md:mx-auto border-t border-outline-variant/10 text-center"
            >
              <div className="flex items-center justify-between mb-12">
                <button className="flex items-center gap-1 text-on-surface/40 hover:text-on-surface transition-all font-black uppercase tracking-tighter text-xs">
                  English <ChevronDown size={14} />
                </button>
                <button 
                  onClick={() => setShowVoicePanel(false)}
                  className="p-2 hover:bg-on-surface/5 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-black tracking-tighter text-on-surface">
                  {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                  {(recordingTime % 60).toString().padStart(2, '0')}
                </span>
                <span className="text-on-surface/20 text-5xl font-black tracking-tighter"> / 05:00</span>
              </div>

              {/* Waveform Mock */}
              <div className="h-24 flex items-center justify-center gap-0.5 mb-12 overflow-hidden px-4">
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={isRecording ? {
                      height: [10, Math.random() * 60 + 10, 10],
                    } : { height: 10 }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                    className="w-1 bg-on-surface/10 rounded-full"
                    style={{ 
                      opacity: Math.abs(i - 20) / 20 > 0.5 ? 0.3 : 1,
                      backgroundColor: i === 20 ? '#f59e0b' : 'currentColor'
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={async () => {
                    if (!isRecording) {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaRecorder.current = new MediaRecorder(stream);
                        audioChunks.current = [];
                        
                        mediaRecorder.current.ondataavailable = (e) => {
                          if (e.data.size > 0) audioChunks.current.push(e.data);
                        };
                        
                        mediaRecorder.current.start();
                        setIsRecording(true);
                        setRecordingTime(0);
                      } catch (err) {
                        console.error("Microphone access denied", err);
                        alert("Please allow microphone access to record audio.");
                      }
                    } else {
                      mediaRecorder.current?.pause();
                      setIsRecording(false);
                    }
                  }}
                  className="w-16 h-16 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-on-surface/10 transition-all"
                >
                  {isRecording ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
                </button>
                <button 
                  onClick={() => {
                    if (!mediaRecorder.current) return;
                    
                    mediaRecorder.current.onstop = () => {
                      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64Audio = reader.result as string;
                        // Insert a real audio element into Tiptap
                        editor?.chain().focus().insertContent(
                          `<p><audio controls src="${base64Audio}" class="w-full my-4 rounded-xl bg-surface-container"></audio></p>`
                        ).run();
                        handleSave();
                      };
                      reader.readAsDataURL(audioBlob);
                      
                      // Stop all tracks to release the microphone
                      mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
                    };
                    
                    mediaRecorder.current.stop();
                    setIsRecording(false);
                    setShowVoicePanel(false);
                    setRecordingTime(0);
                  }}
                  className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all"
                >
                  <Square size={28} className="fill-current" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
