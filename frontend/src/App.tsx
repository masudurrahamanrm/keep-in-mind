/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Heartbeat from './components/Heartbeat';
import { Skeleton } from './components/Skeleton';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Initialize Capacitor Google Auth
try {
  GoogleAuth.initialize({
    clientId: "329859333999-rqm1odrq5kj41f1kqki4sgc5a1qhuad6.apps.googleusercontent.com",
  });
} catch (e) {
  console.warn('Google Auth failed to initialize:', e);
}

// Standard import for Auth (since it's the initial entry for logged-out users)
import Auth from './pages/Auth';

// Lazy-loaded routes for performance (Req #13)
const Notes = lazy(() => import('./pages/Notes'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Account = lazy(() => import('./pages/Account'));
const Labels = lazy(() => import('./pages/Labels'));
const Archive = lazy(() => import('./pages/Archive'));
const Explore = lazy(() => import('./pages/Explore'));
const ExplorePost = lazy(() => import('./pages/ExplorePost'));
const Recent = lazy(() => import('./pages/Recent'));
const Settings = lazy(() => import('./pages/Settings'));
const Drawing = lazy(() => import('./pages/Drawing'));
const Editor  = lazy(() => import('./pages/Editor'));
const Tasks   = lazy(() => import('./pages/Tasks'));

// ── Guard: redirect to /notes if already signed in ─────────
function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Let the context or parent handle initial load
  return user ? <Navigate to="/notes" replace /> : <>{children}</>;
}

// Fallback loader for lazy components (Skeleton View)
const PageLoader = () => (
  <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="w-48 h-10" />
        <Skeleton className="w-64 h-4 opacity-50" />
      </div>
      <Skeleton className="w-12 h-12 rounded-2xl" />
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-surface-container-low border border-outline-variant/20 p-6 rounded-[32px] space-y-4">
          <Skeleton className="w-3/4 h-6" />
          <div className="space-y-2">
            <Skeleton className="w-full h-3 opacity-40" />
            <Skeleton className="w-full h-3 opacity-40" />
            <Skeleton className="w-1/2 h-3 opacity-40" />
          </div>
          <div className="pt-4 flex justify-between items-center">
            <Skeleton className="w-20 h-3 opacity-30" />
            <Skeleton className="w-8 h-8 rounded-full opacity-30" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Heartbeat />
      <Routes>

        {/* Public: login page — redirects to /notes if already signed in */}
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          }
        />

        {/* Private: App pages WITH global layout (sidebar, topbar, bottomnav) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/notes" replace />} />
          <Route path="notes"    element={<Suspense fallback={<PageLoader />}><Notes /></Suspense>}   />
          <Route path="gallery"  element={<Suspense fallback={<PageLoader />}><Gallery /></Suspense>} />
          <Route path="labels"   element={<Suspense fallback={<PageLoader />}><Labels /></Suspense>}  />
          <Route path="archive"  element={<Suspense fallback={<PageLoader />}><Archive /></Suspense>} />
          <Route path="account"  element={<Suspense fallback={<PageLoader />}><Account /></Suspense>} />
          <Route path="tasks"    element={<Suspense fallback={<PageLoader />}><Tasks /></Suspense>} />
          <Route path="explore/:id" element={<Suspense fallback={<PageLoader />}><ExplorePost /></Suspense>} />
          <Route path="recent"   element={<Suspense fallback={<PageLoader />}><Recent /></Suspense>}  />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>}/>
        </Route>

        {/* Private: Full-screen / Immersive views WITHOUT global layout */}
        <Route path="/drawing" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Drawing /></Suspense></ProtectedRoute>} />
        <Route path="/drawing/:id" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Drawing /></Suspense></ProtectedRoute>} />
        <Route path="/editor"      element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Editor /></Suspense></ProtectedRoute>}  />
        <Route path="/editor/:id"  element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Editor /></Suspense></ProtectedRoute>}  />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </BrowserRouter>
  );
}
