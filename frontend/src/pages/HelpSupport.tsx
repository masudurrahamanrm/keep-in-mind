import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, MessageCircle, FileText, Search, ExternalLink } from 'lucide-react';

export default function HelpSupport() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "How do I sync my notes to Google Drive?",
      answer: "Go to your Account settings and tap 'Connect Drive' under Google Drive Sync. Once connected, your notes will automatically back up."
    },
    {
      question: "Can I access my notes offline?",
      answer: "Yes! KeepInMind works offline. Any changes you make will be saved locally and synced automatically when you reconnect to the internet."
    },
    {
      question: "How do I organize notes with labels?",
      answer: "When editing a note, tap the options menu to add or create a label. You can then filter by labels on the main Notes screen."
    }
  ];

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
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Help & Support</h1>
      </div>

      <div className="px-5 py-6 space-y-8 pb-12">
        
        {/* Search Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <MessageCircle size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">How can we help?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Search for articles or browse our FAQs</p>
          
          <div className="w-full mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search support..." 
              className="w-full bg-white dark:bg-[#1A1C20] border border-black/5 dark:border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC107] text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Contact Us</h3>
          <div className="bg-white dark:bg-[#1A1C20] rounded-2xl overflow-hidden shadow-sm border border-black/5 dark:border-white/5">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                  <Mail size={20} className="text-blue-500" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <span className="block text-[15px] font-bold text-gray-800 dark:text-gray-200">Email Support</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Usually replies in 24 hours</span>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-50 dark:bg-purple-900/20">
                  <FileText size={20} className="text-purple-500" strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <span className="block text-[15px] font-bold text-gray-800 dark:text-gray-200">Read Documentation</span>
                  <span className="block text-xs text-gray-500 mt-0.5">Detailed guides and tutorials</span>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1A1C20] rounded-2xl p-4 shadow-sm border border-black/5 dark:border-white/5">
                <h4 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">{faq.question}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
