import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Save, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { cn } from '../Sidebar';
import { Button } from '../settings/SettingsUI';
import { useAuth } from '../../context/AuthContext';

export default function EditProfileModal({ profile, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...profile });
  const [previewUrl, setPreviewUrl] = useState(profile.avatar);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      setError('');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setPreviewUrl(base64String);
        setFormData({ ...formData, avatar: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const { token: jwtToken, googleAccessToken, updateGoogleToken, clearGoogleToken } = useAuth();
  const [isLinking, setIsLinking] = useState(false);

  const handleConnectGoogle = async () => {
    // Redirect to backend OAuth to get updated scopes including Drive
    window.location.href = `/api/auth/google`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    onSave(formData);
  };

  const isGoogleConnected = !!googleAccessToken;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 sm:inset-x-auto top-1/2 -translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-50 glass-panel rounded-[2rem] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-on-surface/5">
          <h2 className="text-xl font-heading font-bold text-on-surface tracking-tight">Edit Profile</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white/10 text-on-surface-variant transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 max-h-[70vh]">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-3 text-error text-sm">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex flex-col items-center mb-2">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-outline-variant/30 shadow-inner bg-surface-container flex items-center justify-center text-3xl font-bold text-primary">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                     formData.name.substring(0, 2).toUpperCase() || 'U'
                  )}
                </div>
                <label className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-sm">
                  <Camera size={24} />
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
              <span className="text-xs text-on-surface-variant mt-3 font-medium">Click to upload (Max 2MB)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-surface/50 border border-outline-variant/30 text-on-surface focus:bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                placeholder="Your Name"
              />
            </div>

            <div className="pt-4 border-t border-white/5 mt-2">
               <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-4">Connected Services</label>
               
               <div className="p-4 rounded-2xl bg-surface-container/50 border border-outline-variant/20 flex items-center justify-between group hover:bg-surface-container transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">Google Drive</h4>
                      <p className="text-xs text-on-surface-variant">Cloud workspace sync</p>
                    </div>
                  </div>

                  {isGoogleConnected ? (
                    <button
                      type="button"
                      onClick={clearGoogleToken}
                      className="px-4 py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error text-xs font-bold transition-all border border-error/10"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isLinking}
                      className="text-xs font-bold text-primary hover:text-primary-high transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10 disabled:opacity-50"
                    >
                      {isLinking ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
               </div>
               <p className="mt-3 text-[10px] leading-relaxed text-on-surface-variant/60 font-medium px-1 flex gap-1.5">
                  <Globe size={11} className="shrink-0 mt-0.5" />
                  Enable Google Drive to keep your notes and profile data synced securely across all your professional devices.
               </p>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
              <Button variant="secondary" onClick={(e) => { e.preventDefault(); onClose(); }}>Cancel</Button>
              <Button variant="primary" icon={Save} onClick={handleSubmit}>Save Profile</Button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
