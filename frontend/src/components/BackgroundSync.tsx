import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncNotesToGoogleDrive } from '../services/driveService';

export default function BackgroundSync() {
  const { user, token, googleAccessToken } = useAuth();
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only set up auto-sync if user is logged in, has our backend token, and is connected to Google Drive
    if (!user || !token || !googleAccessToken || googleAccessToken === 'undefined' || googleAccessToken === 'null') {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    const notesKey = `keep-in-mind-notes-${user._id}`;
    const syncTimeKey = `keep-in-mind-last-sync-${user._id}`;

    const performSync = async () => {
      try {
        const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        if (notes.length === 0) return; // Don't sync if there's nothing to sync

        await syncNotesToGoogleDrive(notes, googleAccessToken, token);
        
        // Update last sync time
        const now = new Date().toLocaleString();
        localStorage.setItem(syncTimeKey, now);
        
        console.debug('[BackgroundSync] Auto-sync to Google Drive successful at', now);
      } catch (err) {
        console.error('[BackgroundSync] Auto-sync to Google Drive failed:', err);
      }
    };

    // Run immediately when component mounts or token changes
    performSync();

    // Set up interval to sync every 5 minutes (300,000 ms)
    syncIntervalRef.current = setInterval(performSync, 5 * 60 * 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user, token, googleAccessToken]);

  return null; // Invisible component that handles background sync
}
