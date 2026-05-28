import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Undo2, Redo2, MoreVertical, Square, Eraser, Pen, Highlighter, 
  PenLine, Trash2, MousePointer2, Circle, Minus, Plus, MoveUpRight, Type, 
  Maximize, Minimize, Grid3X3, Layers, Download, Save, ZoomIn, ZoomOut, Hand
} from 'lucide-react';
import { fabric } from 'fabric';
import { cn } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Tool = 'select' | 'eraser' | 'pen' | 'highlighter' | 'rect' | 'circle' | 'line' | 'arrow' | 'text' | 'pan';

const TOOL_COLORS = [
  '#6750A4', '#1a73e8', '#e53935', '#43a047', '#f9a825', 
  '#9c27b0', '#00bcd4', '#795548', '#000000', '#ffffff'
];

const TOOLS = [
  { id: 'select',      icon: MousePointer2, label: 'Select' },
  { id: 'pan',         icon: Hand,           label: 'Pan' },
  { id: 'pen',         icon: Pen,            label: 'Pen' },
  { id: 'highlighter', icon: Highlighter,    label: 'Highlighter' },
  { id: 'eraser',      icon: Eraser,         label: 'Eraser' },
  { id: 'rect',        icon: Square,         label: 'Rectangle' },
  { id: 'circle',      icon: Circle,         label: 'Circle' },
  { id: 'line',        icon: Minus,          label: 'Line' },
  { id: 'arrow',       icon: MoveUpRight,    label: 'Arrow' },
  { id: 'text',        icon: Type,           label: 'Text' },
];

export default function Drawing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvas = useRef<fabric.Canvas | null>(null);
  
  const [tool, setTool] = useState<Tool>('pen');
  const [showSettings, setShowSettings] = useState(true);
  const [color, setColor] = useState('#6750A4');
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const history = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const isStateChanging = useRef(false);

  const storageKey = user ? `keep-in-mind-notes-${user._id}` : 'keep-in-mind-notes-guest';
  const [note, setNote] = useState<any>(null);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let isActive = true;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
      isDrawingMode: true,
      stopContextMenu: true,
      allowTouchScrolling: false,
      enableRetinaScaling: true,
    });

    fabricCanvas.current = canvas;

    // Grid Background
    const drawGrid = () => {
      if (!isActive || !canvas || !canvas.getElement()) return; // Robust guard
      if (!showGrid) {
        canvas.setBackgroundImage(null as any, canvas.renderAll.bind(canvas));
        return;
      }
      const gridCanvas = document.createElement('canvas');
      gridCanvas.width = 40;
      gridCanvas.height = 40;
      const ctx = gridCanvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(40, 0);
        ctx.lineTo(40, 40);
        ctx.stroke();
        
        ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      try {
        const pattern = new fabric.Pattern({
          source: gridCanvas,
          repeat: 'repeat'
        });
        canvas.setBackgroundColor(pattern, () => {
          if (isActive && canvas && canvas.getContext()) {
             canvas.renderAll();
          }
        });
      } catch (e) {
        console.warn('Failed to set grid pattern', e);
      }
    };

    drawGrid();

    // Event listeners
    const saveState = () => {
      if (isStateChanging.current || !canvas) return;
      const json = JSON.stringify(canvas.toJSON());
      if (history.current[historyIndex.current] === json) return;

      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push(json);
      historyIndex.current++;
      setCanUndo(true);
      setCanRedo(false);
    };

    const handleUndo = () => {
      if (historyIndex.current > 0 && canvas && canvas.getContext()) {
        isStateChanging.current = true;
        historyIndex.current--;
        const state = history.current[historyIndex.current];
        try {
          canvas.loadFromJSON(state, () => {
            if (!isActive || !canvas || !canvas.getContext()) {
              isStateChanging.current = false;
              return;
            }
            canvas.renderAll();
            isStateChanging.current = false;
            setCanUndo(historyIndex.current > 0);
            setCanRedo(true);
          });
        } catch (e) {
          isStateChanging.current = false;
        }
      }
    };

    const handleRedo = () => {
      if (historyIndex.current < history.current.length - 1 && canvas && canvas.getContext()) {
        isStateChanging.current = true;
        historyIndex.current++;
        const state = history.current[historyIndex.current];
        try {
          canvas.loadFromJSON(state, () => {
            if (!isActive || !canvas || !canvas.getContext()) {
              isStateChanging.current = false;
              return;
            }
            canvas.renderAll();
            isStateChanging.current = false;
            setCanUndo(true);
            setCanRedo(historyIndex.current < history.current.length - 1);
          });
        } catch (e) {
          isStateChanging.current = false;
        }
      }
    };

    canvas.on('object:added', saveState);
    canvas.on('object:modified', saveState);
    canvas.on('object:removed', saveState);

    // Zoom/Pan
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoomLevel = canvas.getZoom();
      zoomLevel *= 0.999 ** delta;
      if (zoomLevel > 10) zoomLevel = 10;
      if (zoomLevel < 0.1) zoomLevel = 0.1;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoomLevel);
      setZoom(zoomLevel);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (typeof window === 'undefined') return;
      
      if (e.key === 'Escape') {
        setShowSettings(false);
      }

      // Delete selected object (if not editing text)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = canvas.getActiveObject();
        const isEditingText = activeObject && (activeObject as any).isEditing;

        if (activeObject && !canvas.isDrawingMode && !isEditingText) {
          const activeObjects = canvas.getActiveObjects();
          canvas.remove(...activeObjects);
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }

      // Undo / Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      isActive = false;
      window.removeEventListener('keydown', handleKeyDown);
      canvas.dispose();
      fabricCanvas.current = null;
    };
  }, [theme]);

  // Update Tool Settings
  useEffect(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    canvas.isDrawingMode = ['pen', 'highlighter', 'eraser'].includes(tool);
    
    if (canvas.isDrawingMode) {
      if (tool === 'eraser') {
        // Real eraser using destination-out
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize * 5;
        // In Fabric 5.3, we can't easily use globalCompositeOperation on PencilBrush
        // so we use the "draw with background" as a fallback but make it look better,
        // OR we can use the "eraser" property if the user has the plugin.
        // For now, I'll use a better "clear" logic or specialized brush.
        canvas.freeDrawingBrush.color = theme === 'dark' ? '#1e1e1e' : '#ffffff';
      } else {
        const brush = new fabric.PencilBrush(canvas);
        brush.color = tool === 'highlighter' ? color : color;
        brush.width = tool === 'highlighter' ? brushSize * 4 : brushSize;
        brush.opacity = tool === 'highlighter' ? 0.3 : opacity;
        // Pen pressure simulation (limited in basic fabric pencil)
        canvas.freeDrawingBrush = brush;
      }
    }

    canvas.selection = tool === 'select';
    canvas.defaultCursor = tool === 'pan' ? 'grab' : 'crosshair';
    
    if (tool === 'pan') {
      canvas.on('mouse:down', function(this: any, opt) {
        const evt = opt.e;
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      });
      canvas.on('mouse:move', function(this: any, opt) {
        if (this.isDragging) {
          const e = opt.e;
          const vpt = this.viewportTransform;
          vpt[4] += e.clientX - this.lastPosX;
          vpt[5] += e.clientY - this.lastPosY;
          this.requestRenderAll();
          this.lastPosX = e.clientX;
          this.lastPosY = e.clientY;
        }
      });
      canvas.on('mouse:up', function(this: any) {
        this.setViewportTransform(this.viewportTransform);
        this.isDragging = false;
        this.selection = true;
      });
    } else {
      canvas.off('mouse:down');
      canvas.off('mouse:move');
      canvas.off('mouse:up');
    }

    // NEW: Update active object when properties change
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'i-text') {
        activeObject.set({ fill: color, fontSize: brushSize + 20 });
      } else if (activeObject.type === 'group' && (activeObject as any)._objects) {
        // Handle Arrow groups
        (activeObject as any)._objects.forEach((obj: any) => {
          if (obj.stroke) obj.set({ stroke: color, strokeWidth: brushSize, opacity });
          if (obj.fill && obj.type !== 'line') obj.set({ fill: color, opacity });
        });
      } else {
        if (activeObject.stroke) activeObject.set({ stroke: color, strokeWidth: brushSize });
        if (activeObject.fill) activeObject.set({ fill: color });
        activeObject.set({ opacity });
      }
      canvas.renderAll();
    }
  }, [tool, color, brushSize, opacity, theme]);

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  // Load Note Data
  useEffect(() => {
    const loadDrawing = async () => {
      if (id && fabricCanvas.current) {
        let existingNote = null;
        if (token) {
          try {
            const res = await fetch(`${API_BASE}/notes/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
              existingNote = await res.json();
            }
          } catch (error) {
            console.error('Error fetching drawing:', error);
          }
        } else {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const notes = JSON.parse(saved);
            existingNote = notes.find((n: any) => n.id.toString() === id);
          }
        }

        if (existingNote) {
          setNote(existingNote);
          if (existingNote.canvasData) {
            isStateChanging.current = true;
            try {
              fabricCanvas.current.loadFromJSON(existingNote.canvasData, () => {
                if (fabricCanvas.current && fabricCanvas.current.getContext()) {
                  fabricCanvas.current.renderAll();
                  isStateChanging.current = false;
                  // Push initial state to history
                  const json = JSON.stringify(fabricCanvas.current.toJSON());
                  history.current = [json];
                  historyIndex.current = 0;
                } else {
                  isStateChanging.current = false;
                }
              });
            } catch (e) {
              console.warn('Failed to load drawing data', e);
              isStateChanging.current = false;
            }
          }
        }
      } else {
        setNote({ isNew: true, title: 'Advanced Drawing', type: 'drawing' });
      }
    };
    
    loadDrawing();
  }, [id, storageKey, token]);

  // Shapes & Text Tools
  const addShape = (type: Tool) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const center = canvas.getVpCenter();
    let obj;

    switch (type) {
      case 'rect':
        obj = new fabric.Rect({
          left: center.x - 50,
          top: center.y - 50,
          fill: color,
          width: 100,
          height: 100,
          opacity: opacity,
        });
        break;
      case 'circle':
        obj = new fabric.Circle({
          left: center.x - 50,
          top: center.y - 50,
          fill: color,
          radius: 50,
          opacity: opacity,
        });
        break;
      case 'line':
        obj = new fabric.Line([50, 50, 150, 150], {
          left: center.x - 50,
          top: center.y - 50,
          stroke: color,
          strokeWidth: brushSize,
          opacity: opacity,
        });
        break;
      case 'arrow':
        // Custom Arrow implementation (Line with triangle head)
        const line = new fabric.Line([50, 50, 150, 150], {
          stroke: color,
          strokeWidth: brushSize,
          opacity: opacity,
        });
        const triangle = new fabric.Triangle({
          width: 20,
          height: 20,
          fill: color,
          left: 150,
          top: 150,
          angle: 45,
          originX: 'center',
          originY: 'center',
          opacity: opacity,
        });
        obj = new fabric.Group([line, triangle], {
          left: center.x - 50,
          top: center.y - 50,
        });
        break;
      case 'text':
        obj = new fabric.IText('Type something...', {
          left: center.x,
          top: center.y,
          fontFamily: 'Inter, sans-serif',
          fill: color,
          fontSize: brushSize + 20,
          opacity: opacity,
        });
        break;
    }

    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
      setTool('select');
    }
  };

  const handleToolClick = (id: Tool) => {
    if (tool === id) {
      setShowSettings(!showSettings);
    } else {
      setTool(id);
      setShowSettings(true);
      if (['rect', 'circle', 'line', 'arrow', 'text'].includes(id)) {
        addShape(id);
      }
    }
  };

  const undo = () => {
    if (historyIndex.current > 0 && fabricCanvas.current) {
      isStateChanging.current = true;
      historyIndex.current--;
      const state = history.current[historyIndex.current];
      try {
        fabricCanvas.current.loadFromJSON(state, () => {
          if (fabricCanvas.current && fabricCanvas.current.getContext()) {
            fabricCanvas.current.renderAll();
            isStateChanging.current = false;
            setCanUndo(historyIndex.current > 0);
            setCanRedo(true);
          } else {
            isStateChanging.current = false;
          }
        });
      } catch (e) {
        isStateChanging.current = false;
      }
    }
  };

  const redo = () => {
    if (historyIndex.current < history.current.length - 1 && fabricCanvas.current) {
      isStateChanging.current = true;
      historyIndex.current++;
      const state = history.current[historyIndex.current];
      try {
        fabricCanvas.current.loadFromJSON(state, () => {
          if (fabricCanvas.current && fabricCanvas.current.getContext()) {
            fabricCanvas.current.renderAll();
            isStateChanging.current = false;
            setCanUndo(true);
            setCanRedo(historyIndex.current < history.current.length - 1);
          } else {
            isStateChanging.current = false;
          }
        });
      } catch (e) {
        isStateChanging.current = false;
      }
    }
  };

  const handleSave = async (silent = false) => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({ format: 'png' });
    const json = canvas.toJSON();
    
    let updatedNote = { 
      ...note, 
      content: dataUrl, 
      canvasData: json, 
      date: new Date().toISOString(),
      type: 'drawing'
    };
    
    if (token) {
      try {
        if (note.isNew) {
          delete updatedNote.isNew;
          await fetch(`${API_BASE}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updatedNote)
          });
        } else {
          await fetch(`${API_BASE}/notes/${note._id || note.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(updatedNote)
          });
        }
      } catch (error) {
        console.error('Error saving drawing:', error);
      }
    } else {
      const saved = localStorage.getItem(storageKey);
      const notes = saved ? JSON.parse(saved) : [];
      
      if (note.isNew) {
        updatedNote = { ...updatedNote, id: Date.now(), isNew: false };
        notes.unshift(updatedNote);
        setNote(updatedNote);
      } else {
        const idx = notes.findIndex((n: any) => n.id === note.id);
        if (idx !== -1) notes[idx] = updatedNote;
        else notes.unshift(updatedNote);
      }

      localStorage.setItem(storageKey, JSON.stringify(notes));
    }
    
    if (!silent) {
      navigate('/notes');
    }
  };

  const handleExport = () => {
    const canvas = fabricCanvas.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // Export at 2x for better quality
    });
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-surface overflow-hidden group">
      {/* Top Floating Actions */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        <button
          onClick={() => navigate('/notes')}
          className="w-10 h-10 glass-panel rounded-xl hover:scale-105 transition-all text-on-surface pointer-events-auto flex items-center justify-center"
          title="Back to Notes"
        >
          <ArrowLeft size={18} />
        </button>
        
        {/* Undo/Redo/Grid — desktop only */}
        <div className="hidden sm:flex items-center gap-1 glass-panel p-0.5 rounded-lg pointer-events-auto">
          {[
            { id: 'undo', icon: Undo2, action: undo, disabled: !canUndo },
            { id: 'redo', icon: Redo2, action: redo, disabled: !canRedo },
            { id: 'grid', icon: Grid3X3, action: () => setShowGrid(!showGrid), active: showGrid },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={btn.action}
              disabled={btn.disabled}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                btn.active ? "bg-primary text-white" : "hover:bg-surface-container text-on-surface-variant disabled:opacity-30"
              )}
            >
              <btn.icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Top Right Actions */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="hidden sm:flex items-center gap-1 glass-panel p-0.5 rounded-lg pointer-events-auto">
          <button
            onClick={() => {
              const canvas = fabricCanvas.current;
              if (canvas) {
                const center = canvas.getVpCenter();
                canvas.zoomToPoint({ x: center.x, y: center.y }, canvas.getZoom() * 1.1);
                setZoom(canvas.getZoom());
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-container text-on-surface-variant transition-all"
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          <div className="px-1.5 text-[10px] font-bold text-on-surface-variant min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => {
              const canvas = fabricCanvas.current;
              if (canvas) {
                const center = canvas.getVpCenter();
                canvas.zoomToPoint({ x: center.x, y: center.y }, canvas.getZoom() * 0.9);
                setZoom(canvas.getZoom());
              }
            }}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-md transition-all"
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
        </div>

        <button
          onClick={handleExport}
          className="w-9 h-9 flex items-center justify-center glass-panel text-on-surface-variant rounded-lg hover:scale-105 transition-all pointer-events-auto"
          title="Export as PNG"
        >
          <Download size={16} />
        </button>

        <button
          onClick={() => handleSave(false)}
          className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-primary text-white rounded-lg shadow-lg text-xs font-bold hover:bg-primary/90 transition-all scale-100 hover:scale-105 pointer-events-auto min-h-[36px]"
        >
          <Save size={15} />
          <span>Save</span>
        </button>
      </div>

      {/* Desktop: Slim Vertical Sidebar (Tools) */}
      <div className="absolute left-3 top-24 z-20 pointer-events-none hidden sm:block">
        <div className="flex flex-col gap-1 p-0.5 glass-panel rounded-xl pointer-events-auto w-[40px]">
          {TOOLS.map((t) => (
            <div key={t.id} className="relative group/tool-item flex flex-col items-center">
              <button
                onClick={() => handleToolClick(t.id as Tool)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all relative",
                  tool === t.id
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-on-surface-variant hover:bg-surface-container hover:scale-105"
                )}
              >
                <t.icon size={16} strokeWidth={tool === t.id ? 2.5 : 2} />
              </button>
              {/* Minimal Tooltip */}
              <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-[9px] font-bold rounded-lg opacity-0 scale-90 group-hover/tool-item:opacity-100 group-hover/tool-item:scale-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-white/10">
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: Horizontal Bottom Tool Bar */}
      <div className="absolute bottom-[5rem] left-0 right-0 z-20 px-3 pointer-events-none sm:hidden">
        <div className="flex items-center gap-1 glass-panel p-1 rounded-2xl pointer-events-auto overflow-x-auto no-scrollbar">
          {/* Undo/Redo */}
          <button onClick={undo} disabled={!canUndo} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant disabled:opacity-30 shrink-0">
            <Undo2 size={18} />
          </button>
          <button onClick={redo} disabled={!canRedo} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant disabled:opacity-30 shrink-0">
            <Redo2 size={18} />
          </button>
          <div className="w-px h-6 bg-on-surface/10 mx-1 shrink-0" />
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleToolClick(t.id as Tool)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                tool === t.id
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              <t.icon size={18} strokeWidth={tool === t.id ? 2.5 : 2} />
            </button>
          ))}
          <div className="w-px h-6 bg-on-surface/10 mx-1 shrink-0" />
          <button onClick={handleExport} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container text-on-surface-variant shrink-0">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Property Bar (Floating Bottom) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-2 glass-panel rounded-xl translate-z-0 max-w-[95vw] w-max"
          >
            {/* Tool Icon Indicator */}
            <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-3 border-r border-on-surface/10 shrink-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                {(() => {
                  const activeT = TOOLS.find(t => t.id === tool);
                  const Icon = activeT?.icon || MousePointer2;
                  return <Icon size={12} className="sm:w-[14px]" />;
                })()}
              </div>
              <span className="text-[10px] font-bold text-on-surface uppercase tracking-tight hidden sm:block">{TOOLS.find(t => t.id === tool)?.label}</span>
            </div>

            {/* Contextual Controls */}
            <div className="flex items-center gap-2 sm:gap-8 overflow-hidden">
              {/* Color Picker (Shown for most except focus/eraser/pan) */}
              {tool !== 'eraser' && tool !== 'pan' && tool !== 'select' && (
                <div className="flex items-center gap-1 sm:gap-2 border-r border-on-surface/10 pr-2 sm:pr-6 shrink-0">
                  {TOOL_COLORS.slice(0, 6).map((c, i) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all hover:scale-125",
                        color === c ? "border-primary scale-110 sm:scale-125 shadow-lg" : "border-transparent",
                        i >= 3 && "hidden sm:block"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                  <div className="w-px h-6 bg-on-surface/10 mx-2" />
                  <div className="relative">
                      <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 via-green-500 to-blue-500 p-0.5"
                      >
                        <div className="w-full h-full rounded-md border border-white" style={{ background: color }} />
                      </button>
                    <AnimatePresence>
                      {showColorPicker && (
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.9, opacity: 0, y: 10 }}
                          className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 p-3 glass-panel rounded-2xl grid grid-cols-4 gap-2 z-[60] translate-z-0"
                        >
                          {TOOL_COLORS.map(c => (
                            <button 
                              key={c} onClick={() => { setColor(c); setShowColorPicker(false); }}
                              className="w-6 h-6 rounded-full border border-on-surface/10"
                              style={{ background: c }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Size Slider (Shown for Pen, Highlighter, Eraser, Line) */}
              {(tool === 'pen' || tool === 'highlighter' || tool === 'eraser' || tool === 'line' || tool === 'text') && (
                <div className="flex flex-col gap-0.5 w-16 sm:w-24 shrink-0">
                  <div className="flex justify-between text-[8px] sm:text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <span>{tool === 'text' ? 'Size' : 'Px'}</span>
                    <span>{brushSize}</span>
                  </div>
                  <input 
                    type="range" min="1" max="100" value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="accent-primary h-1 rounded-full cursor-pointer"
                  />
                </div>
              )}

              {/* Opacity Slider (Shown for non-eraser drawing tools) */}
              {(tool === 'pen' || tool === 'highlighter' || tool === 'rect' || tool === 'circle' || tool === 'line' || tool === 'arrow') && (
                <div className="flex flex-col gap-0.5 w-16 sm:w-24 shrink-0">
                  <div className="flex justify-between text-[8px] sm:text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                    <span>%</span>
                    <span>{Math.round(opacity * 100)}</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="1" step="0.1" value={opacity} 
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="accent-primary h-1 rounded-full cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowSettings(false)}
              className="ml-2 p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
            >
              <Minimize size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas Wrap */}
      <div className="w-full h-full cursor-crosshair z-1">
        <canvas ref={canvasRef} style={{ pointerEvents: 'auto' }} />
      </div>

    </div>
  );
}
