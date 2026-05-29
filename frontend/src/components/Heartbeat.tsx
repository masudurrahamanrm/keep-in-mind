import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Heartbeat() {
  const { token } = useAuth();

  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    const activeToken = token || adminToken;

    if (!activeToken) return;

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    const sendPing = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/ping`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) {
          console.debug('Heartbeat rejected:', res.status);
        }
      } catch (err) {
        console.debug('Heartbeat network error');
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 120000);
    return () => clearInterval(interval);
  }, [token]);

  return null;
}
