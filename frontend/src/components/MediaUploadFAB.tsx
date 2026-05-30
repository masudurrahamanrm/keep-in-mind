import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Image as ImageIcon, Film as FilmIcon, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface MediaUploadFABProps {
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
}

export default function MediaUploadFAB({ onFilesSelect, isLoading }: MediaUploadFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [acceptType, setAcceptType] = useState('image/*,video/*');
  const { googleAccessToken } = useAuth();
  
  const isGoogleConnected = !!(googleAccessToken && googleAccessToken !== 'undefined' && googleAccessToken !== 'null');

  const toggleMenu = () => {
    if (isLoading) return;
    if (!isGoogleConnected && !isOpen) {
      toast.warning('Google Drive Not Connected. Go to Profile to connect your Drive.', {
        position: "top-center",
        autoClose: 4000,
      });
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleActionClick = (type: 'image' | 'video' | 'document') => {
    if (type === 'image') setAcceptType('image/*');
    else if (type === 'video') setAcceptType('video/*');
    else setAcceptType('.pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf');
    // Small timeout to ensure acceptType is updated before picker opens
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
    setIsOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      onFilesSelect(files);
      e.target.value = '';
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-on-surface/10 backdrop-blur-md z-[60]"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-[70] flex flex-col items-end">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          className="hidden"
          accept={acceptType}
          multiple
        />
        
        {/* Speed Dial Actions */}
        <div className="flex flex-col gap-4 mb-5 items-end relative">
          <AnimatePresence>
            {isOpen && (
              <>

                <motion.button
                  key="photo-upload"
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => handleActionClick('image')}
                  className="flex items-center gap-3 group"
                >
                  <span className="bg-white dark:bg-neutral-800 px-3 py-1 rounded-xl shadow-xl text-amber-600 dark:text-amber-400 font-bold text-xs tracking-wide group-hover:scale-105 transition-all">
                    Upload Photo
                  </span>
                  <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all text-amber-600 dark:text-amber-400 border border-neutral-100 dark:border-neutral-700">
                    <ImageIcon size={20} />
                  </div>
                </motion.button>

                <motion.button
                  key="doc-upload"
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => handleActionClick('document')}
                  className="flex items-center gap-3 group"
                >
                  <span className="bg-white dark:bg-neutral-800 px-3 py-1 rounded-xl shadow-xl text-amber-600 dark:text-amber-400 font-bold text-xs tracking-wide group-hover:scale-105 transition-all">
                    Upload Document
                  </span>
                  <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all text-amber-600 dark:text-amber-400 border border-neutral-100 dark:border-neutral-700">
                    <FileText size={20} />
                  </div>
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Main Toggle Button */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMenu}
            disabled={isLoading}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center 
              bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-[0_8px_30px_rgb(245,158,11_/_40%)] hover:shadow-[0_12px_40px_rgb(245,158,11_/_50%)] transition-all duration-300 relative z-10
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2 className="w-7 h-7 animate-spin" />
                </motion.div>
              ) : isOpen ? (
                <motion.div 
                  key="close" 
                  initial={{ rotate: -90, opacity: 0 }} 
                  animate={{ rotate: 0, opacity: 1 }} 
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <X size={26} strokeWidth={3} />
                </motion.div>
              ) : (
                <motion.div 
                  key="plus" 
                  initial={{ rotate: 90, opacity: 0 }} 
                  animate={{ rotate: 0, opacity: 1 }} 
                  exit={{ rotate: -90, opacity: 0 }}
                >
                  <Plus size={26} strokeWidth={3} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Pulsing indicator - only when closed and not loading */}
          {!isOpen && !isLoading && (
            <motion.div
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-amber-500/40 shadow-[0_0_20px_rgb(245,158,11_/_30%)]"
            />
          )}
        </div>
      </div>
    </>
  );
}
