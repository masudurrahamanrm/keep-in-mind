import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { db, LocalNote } from '../database/db';

const API_URL = import.meta.env.VITE_API_URL || '';
const SOCKET_URL = window.location.hostname.includes('localhost') 
  ? 'http://localhost:5000' 
  : window.location.origin;

export function useSync() {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(
    localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime') as string) : null
  );

  const performSync = useCallback(async () => {
    if (!token || !isOnline) return;
    setIsSyncing(true);

    try {
      const currentLastSync = localStorage.getItem('lastSyncTime');
      // 1. Push pending local changes to server
      const pendingNotes = await db.notes.where('syncStatus').equals('pending').toArray();
      if (pendingNotes.length > 0) {
        const pushRes = await fetch(`${API_URL}/sync/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes: pendingNotes })
        });
        
        if (pushRes.ok) {
          const { updated } = await pushRes.json();
          // Update local notes with server IDs and mark as synced
          for (const item of updated) {
            const { clientId, serverNote } = item;
            await db.notes.update(clientId, { ...serverNote, syncStatus: 'synced' });
          }
        }
      }

      // 2. Pull latest remote changes since last sync
      let pullUrl = `${API_URL}/sync/pull`;
      if (currentLastSync) {
        pullUrl += `?since=${new Date(currentLastSync).toISOString()}`;
      }
      
      const pullRes = await fetch(pullUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (pullRes.ok) {
        const remoteNotes = await pullRes.json();
        for (const note of remoteNotes) {
          // Put will add or replace existing notes based on primary key (_id or localId)
          // We need to ensure we map _id correctly.
          const existing = await db.notes.where('_id').equals(note._id).first();
          if (existing) {
            await db.notes.update(existing.localId, { ...note, syncStatus: 'synced' });
          } else {
            await db.notes.add({ ...note, syncStatus: 'synced' });
          }
        }
      }

      // 3. Update sync time
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now.toISOString());

    } catch (err) {
      console.error('Background sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  }, [token, isOnline]); // Removed lastSyncTime from dependencies

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      const socket = io(SOCKET_URL, {
        auth: { token }
      });

      socket.on('connect', () => {
        console.log('[Sync] Socket connected');
        // Trigger initial sync on connection
        performSync();
      });

      socket.on('note_updated', async (data) => {
        // Real-time update received from another device
        console.log('[Sync] Received real-time update', data);
        const existing = await db.notes.where('_id').equals(data._id).first();
        if (existing) {
          await db.notes.update(existing.localId, { ...data, syncStatus: 'synced' });
        } else {
          await db.notes.add({ ...data, syncStatus: 'synced' });
        }
      });

      socket.on('note_deleted', async (data) => {
        const existing = await db.notes.where('_id').equals(data._id).first();
        if (existing) {
          await db.notes.update(existing.localId, { ...data, trashed: true, syncStatus: 'synced' });
        }
      });

      socket.on('trigger_sync', () => {
        performSync();
      });

      socketRef.current = socket;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user, token]); // Removed performSync to avoid infinite disconnect/reconnect loops

  const emitUpdate = useCallback((note: LocalNote) => {
    if (socketRef.current && isOnline) {
      socketRef.current.emit('note_updated', note);
    }
  }, [isOnline]);

  const emitDelete = useCallback((note: LocalNote) => {
    if (socketRef.current && isOnline) {
      socketRef.current.emit('note_deleted', note);
    }
  }, [isOnline]);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    performSync,
    emitUpdate,
    emitDelete
  };
}
