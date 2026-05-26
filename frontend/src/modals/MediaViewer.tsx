import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ChevronRight, ExternalLink, Maximize2, Play, Pause, 
  Volume2, VolumeX, Pencil, RotateCcw, RotateCw, FastForward, Rewind, 
  Settings, Download, ZoomIn, ZoomOut, RotateCw as RotateIcon
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface MediaViewerProps {
  media: any;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRename: (id: string, currentName: string) => void;
}

export default function MediaViewer({ media, onClose, onNext, onPrev, onRename }: MediaViewerProps) {
  const { googleAccessToken } = useAuth();
  const isVideo = media.fileType.startsWith('video/');
  
  // Video States
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipX, setTooltipX] = useState(0);
  
  // Image States
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout|null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isValidToken = !!(googleAccessToken && googleAccessToken !== 'undefined' && googleAccessToken !== 'null');
  const streamBase = isValidToken
    ? `${API_BASE}/gallery/stream/${media.fileId}?token=${googleAccessToken}`
    : null;
  const directLink = streamBase ?? media.fileUrl;
  const downloadLink = streamBase ? `${streamBase}&download=true` : media.fileUrl;

  // Idle Detection for Auto-hide Controls
  const resetIdleTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  }, [isPlaying]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [resetIdleTimer]);

  // Video Handlers
  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.play().catch(err => console.log('Autoplay blocked:', err));
    }
  }, [media.fileId, isVideo, playbackRate]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else if (isMuted) setIsMuted(false);
    }
  };

  // Fullscreen Sync
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!containerRef.current) return;

    const elem = containerRef.current as any;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      else if ((document as any).msExitFullscreen) (document as any).msExitFullscreen();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT';
      if (isInput) return;

      switch(e.key.toLowerCase()) {
        case ' ': 
          e.preventDefault(); 
          togglePlay(); 
          break;
        case 'f': 
          toggleFullscreen(); 
          break;
        case 'm': 
          setIsMuted(prev => !prev); 
          break;
        case 'arrowright': 
          if (isVideo) skip(5); 
          else onNext();
          break;
        case 'arrowleft': 
          if (isVideo) skip(-5); 
          else onPrev();
          break;
        case 'escape': 
          onClose(); 
          break;
      }
      resetIdleTimer();
    };

    const handleGlobalPointerUp = () => setIsSeeking(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isVideo, isPlaying, resetIdleTimer, onNext, onPrev, onClose]);

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    setHoverTime(percentage * duration);
    setTooltipX(x);
  };

  const handleMediaError = async () => {
     console.error('Media playback failed. Attempting to refresh session...');
  };

  const modalContent = (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/98 backdrop-blur-3xl transition-all duration-500 overflow-hidden ${showControls ? 'cursor-default' : 'cursor-none'}`}
      onMouseMove={resetIdleTimer}
      onClick={() => isVideo && togglePlay()}
    >
      {/* Top Bar Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-4 md:p-8 flex items-center justify-between z-50 bg-gradient-to-b from-black/90 via-black/40 to-transparent"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={onClose}
                className="p-2.5 md:p-3 bg-white/10 hover:bg-error/30 text-white rounded-2xl transition-all backdrop-blur-xl border border-white/10 shadow-lg active:scale-90"
                title="Close"
              >
                <X size={24} />
              </button>
              
              <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-white font-heading font-bold text-base md:text-2xl line-clamp-1 drop-shadow-2xl max-w-[120px] sm:max-w-md">{media.fileName}</h2>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRename(media._id, media.fileName); }}
                    className="p-1.5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
                <p className="text-white/50 text-[9px] md:text-xs font-bold uppercase tracking-widest">
                  {format(new Date(media.uploadedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => window.open(downloadLink, '_blank')} 
                className="p-2.5 md:p-3 bg-white/5 hover:bg-primary text-white rounded-2xl transition-all backdrop-blur-xl border border-white/5 active:scale-90"
                title="Download"
              >
                <Download size={20} />
              </button>
              <a
                href={media.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all backdrop-blur-xl border border-white/5 hidden lg:flex items-center gap-2 px-5"
              >
                <ExternalLink size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Drive</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Navigation Controls (On-Screen Buttons) */}

        {/* Media Logic */}
        <motion.div
          key={media._id}
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          drag={zoom === 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const threshold = 50;
            if (info.offset.x < -threshold) onNext();
            else if (info.offset.x > threshold) onPrev();
          }}
          className={`relative flex items-center justify-center transition-all duration-500 ${isFullscreen ? 'w-screen h-screen' : 'max-w-full max-h-full'}`}
        >
          {isVideo ? (
            <div className={`relative group/video overflow-hidden transition-all duration-500 ${isFullscreen ? 'w-screen h-screen rounded-none shadow-none border-none' : 'shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-white/5'}`}>
              <video
                ref={videoRef}
                src={directLink}
                className={`transition-all duration-500 ${isFullscreen ? 'w-screen h-screen object-contain' : 'max-h-[85vh] max-w-full w-auto h-auto rounded-lg shadow-2xl'}`}
                controls={false}
                loop
                muted={isMuted}
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current && !isSeeking) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                onError={handleMediaError}
              />
              
              {/* Playback Central Indicator */}
              <AnimatePresence>
                {!isPlaying && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] pointer-events-none"
                  >
                    <div className="p-6 bg-white shadow-2xl rounded-full text-black">
                      <Play size={32} fill="currentColor" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div 
              className={`relative group transition-all duration-500 overflow-hidden ${isFullscreen ? 'w-screen h-screen rounded-none' : ''}`}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              onClick={e => e.stopPropagation()}
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                  );
                  (e.currentTarget as any)._initialDist = dist;
                  (e.currentTarget as any)._initialZoom = zoom;
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && (e.currentTarget as any)._initialDist) {
                  e.preventDefault();
                  const dist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                  );
                  const scale = dist / (e.currentTarget as any)._initialDist;
                  const newZoom = Math.max(1, Math.min(3, (e.currentTarget as any)._initialZoom * scale));
                  setZoom(newZoom);
                }
              }}
            >
              <img
                src={directLink}
                alt={media.fileName}
                className={`transition-all duration-500 touch-none ${isFullscreen ? 'w-screen h-screen object-contain rounded-none' : 'max-h-[85vh] w-auto h-auto shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10'}`}
                onError={handleMediaError}
              />
              
              {/* Image Controls Overlay removed from here */}
            </div>
          )}
        </motion.div>

        {/* Video Controls (Moved Outside to the bottom of the screen) */}
        {isVideo && (
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 w-[90%] sm:max-w-2xl p-4 sm:p-6 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 flex flex-col gap-3 z-50 shadow-2xl"
              >
                <div 
                  className="w-full flex flex-col group/seeker relative pt-2 pb-1" 
                  onClick={e => e.stopPropagation()} 
                  onMouseDown={e => e.stopPropagation()}
                  onMouseMove={handleSeekMouseMove}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  {/* Progress Track */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-white/20 rounded-full overflow-hidden group-hover/seeker:h-1.5 transition-all duration-200">
                    <div 
                      className="h-full bg-red-600 relative" 
                      style={{ width: `${(duration ? (currentTime / duration) * 100 : 0)}%` }}
                    />
                  </div>

                  {/* Scrubber */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-red-600 rounded-full -translate-x-1/2 scale-0 group-hover/seeker:scale-100 transition-transform duration-200 pointer-events-none z-20 border border-white/40"
                    style={{ left: `${(duration ? (currentTime / duration) * 100 : 0)}%` }}
                  />

                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    onPointerDown={(e) => { e.stopPropagation(); setIsSeeking(true); }}
                    onPointerUp={(e) => { e.stopPropagation(); setIsSeeking(false); }}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer appearance-none"
                  />

                  <div className="flex justify-between text-[9px] font-mono font-bold text-white/40 tracking-tighter mt-1 px-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="text-white/60 hover:text-white transition-all">
                      <Rewind size={20} />
                    </button>
                    <button onClick={togglePlay} className="text-white hover:scale-110 transition-all">
                      {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white/60 hover:text-white transition-all">
                      <FastForward size={20} />
                    </button>
                    
                    <div className="w-px h-4 bg-white/10 hidden sm:block"></div>
                    
                    <div className="hidden sm:flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="text-white/60 hover:text-white">
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 accent-white bg-white/10 rounded-full cursor-pointer appearance-none" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className={`px-2 py-0.5 rounded border text-[9px] font-bold transition-all ${showSpeedMenu ? 'bg-primary border-primary text-white' : 'border-white/20 text-white/40'}`}>
                      {playbackRate}x
                    </button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full mb-4 right-0 bg-black/80 backdrop-blur-2xl rounded-2xl p-2 border border-white/10 shadow-2xl flex flex-col min-w-[80px]">
                        {[0.5, 1, 1.5, 2].map(rate => (
                          <button key={rate} onClick={() => { setPlaybackRate(rate); setShowSpeedMenu(false); }} className={`px-4 py-2 text-[10px] font-bold rounded-lg text-left ${playbackRate === rate ? 'bg-primary text-white' : 'text-white/60 hover:bg-white/10'}`}>
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={toggleFullscreen} className="text-white/60 hover:text-white"><Maximize2 size={18} /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Image Controls Overlay (Moved Outside for better mobile positioning) */}
        {!isVideo && (
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-black/60 backdrop-blur-2xl rounded-[2rem] border border-white/10 text-white z-[60]"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={() => setZoom(prev => Math.max(1, prev - 0.25))} className="p-2 hover:bg-white/10 rounded-full transition-all"><ZoomOut size={20} /></button>
                <span className="text-[10px] font-bold min-w-[30px] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))} className="p-2 hover:bg-white/10 rounded-full transition-all"><ZoomIn size={20} /></button>
                <div className="w-px h-6 bg-white/20"></div>
                <button onClick={() => setRotation(prev => prev + 90)} className="p-2 hover:bg-white/10 rounded-full transition-all"><RotateIcon size={20} /></button>
                <div className="w-px h-6 bg-white/20"></div>
                <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-full transition-all"><Maximize2 size={20} /></button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      
      {/* Footer Info Prompt */}
      {showControls && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/20 text-[9px] tracking-[0.3em] uppercase font-bold hidden md:block">
          Use Arrows to Navigate • Space to Play • Esc to Close
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
