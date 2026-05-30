import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
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
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Terms of Service</h1>
      </div>

      <div className="px-6 py-8 flex flex-col space-y-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">1. Agreement to Terms</h2>
          <p className="leading-relaxed">
            By accessing or using KeepInMind, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">2. Use of Service</h2>
          <p className="leading-relaxed mb-2">
            KeepInMind is provided for your personal, non-commercial use. You agree to use the app responsibly and in compliance with all applicable laws. You are prohibited from:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Attempting to interfere with, disrupt, or compromise the system's integrity or security.</li>
            <li>Using the app to store or distribute malicious content, illegal material, or spam.</li>
            <li>Attempting to reverse engineer or gain unauthorized access to our servers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">3. User Accounts</h2>
          <p className="leading-relaxed">
            You are responsible for safeguarding the password and credentials you use to access the app. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">4. User Content</h2>
          <p className="leading-relaxed">
            You retain all rights to the content you create and store within KeepInMind. We claim no ownership over your notes, drawings, or tasks. By syncing your data with third-party services (like Google Drive), you are bound by their respective Terms of Service as well.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">5. Disclaimer of Warranties</h2>
          <p className="leading-relaxed">
            The service is provided "AS IS" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or completely secure, although we strive to ensure the highest quality experience.
          </p>
        </section>
        
        <p className="text-xs text-gray-500 mt-8 text-center">
          Last updated: May 30, 2026
        </p>
      </div>
    </div>
  );
}
