import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App.tsx';
import './index.css';

// Lazy load Admin App from the sibling directory using the @admin alias
const AdminApp = lazy(() => import('@admin/App'));

const hostname = window.location.hostname;
// Check if we are on the admin subdomain
const isAdminDomain = hostname === 'admin.keepinmind.in' || hostname.startsWith('admin-') || hostname.includes('admin.');

const rootElement = document.getElementById('root')!;

import { PreferencesProvider } from './context/PreferencesContext';

if (isAdminDomain) {
  // Dynamically import admin styles only when on admin domain
  import('@admin/index.css');

  createRoot(rootElement).render(
    <StrictMode>
      <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#0a0c10] text-white font-sans">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-sm font-bold tracking-widest uppercase opacity-50">Initializing Admin Portal</p>
          </div>
        </div>
      }>
        <AdminApp />
      </Suspense>
    </StrictMode>
  );
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

