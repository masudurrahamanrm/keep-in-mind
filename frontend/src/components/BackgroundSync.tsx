import { useSync } from '../hooks/useSync';

export default function BackgroundSync() {
  // The hook handles setup, online/offline events, and socket.io initialization automatically
  useSync();
  
  return null; // Invisible component
}
