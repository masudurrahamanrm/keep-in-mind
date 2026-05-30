import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
        <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Privacy Policy</h1>
      </div>

      <div className="px-6 py-8 flex flex-col space-y-6 text-sm text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">1. Introduction</h2>
          <p className="leading-relaxed">
            Welcome to KeepInMind. We are committed to protecting your privacy and ensuring your personal information and notes remain secure. This Privacy Policy outlines how we collect, use, and safeguard your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">2. Information We Collect</h2>
          <p className="leading-relaxed mb-2">
            When you use KeepInMind, we may collect the following types of information:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account Data:</strong> Your email address and basic profile information when you register an account.</li>
            <li><strong>Content Data:</strong> The notes, tasks, reminders, and drawings you create within the app.</li>
            <li><strong>Sync Data:</strong> If you opt-in to Google Drive Sync, we receive access tokens to safely back up your encrypted data to your personal cloud.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain the core functionalities of the app.</li>
            <li>To securely synchronize your notes across your devices.</li>
            <li>To facilitate third-party backups (e.g., Google Drive) at your explicit request.</li>
            <li>To improve and optimize the user experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">4. Data Security</h2>
          <p className="leading-relaxed">
            We implement robust security measures to protect your data. Your notes and personal data are encrypted in transit. You retain full control over your data, and we do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">5. Changes to This Policy</h2>
          <p className="leading-relaxed">
            We may update our Privacy Policy from time to time. Any changes will be reflected on this page, and your continued use of KeepInMind constitutes your acceptance of the updated policy.
          </p>
        </section>
        
        <p className="text-xs text-gray-500 mt-8 text-center">
          Last updated: May 30, 2026
        </p>
      </div>
    </div>
  );
}
