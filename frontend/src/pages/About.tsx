import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, ShieldCheck, FileText, Globe } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col bg-[#FFF9ED] dark:bg-[#111318]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-4 bg-white/80 dark:bg-[#1A1C20]/80 backdrop-blur-md sticky top-0 z-50 border-b border-black/5 dark:border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-900 dark:text-gray-100" />
        </button>
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">About</h1>
      </div>

      <div className="px-5 py-8 flex flex-col items-center">
        {/* App Icon */}
        <div className="w-24 h-24 rounded-[20px] shadow-lg shadow-[#FFC107]/20 mb-4 overflow-hidden bg-white">
          <img 
            src="/app-icon-generated.png" 
            alt="KeepInMind Logo" 
            className="w-full h-full object-cover mix-blend-multiply" 
          />
        </div>
        
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">KeepInMind</h2>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-1 mb-6">Version 1.0.0</p>

        <p className="text-center text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed mb-8">
          Your thoughts, always organized. KeepInMind is a secure, intelligent, and beautifully crafted workspace designed to help you capture ideas, organize tasks, and sync seamlessly across devices.
        </p>

        {/* Links */}
        <div className="w-full bg-white dark:bg-[#1A1C20] rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5">

          <button 
            onClick={() => navigate('/privacy-policy')}
            className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-900/20">
                <ShieldCheck size={16} className="text-green-500" strokeWidth={2.5} />
              </div>
              <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">Privacy Policy</span>
            </div>
            <ChevronLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          <button 
            onClick={() => navigate('/terms-of-service')}
            className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 dark:bg-purple-900/20">
                <FileText size={16} className="text-purple-500" strokeWidth={2.5} />
              </div>
              <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">Terms of Service</span>
            </div>
            <ChevronLeft size={16} className="text-gray-400 rotate-180" />
          </button>

        </div>

        <div className="mt-8 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
          <p>© 2026 KeepInMind. All rights reserved.</p>
          <p className="mt-1">Crafted with care.</p>
        </div>
      </div>
    </div>
  );
}
