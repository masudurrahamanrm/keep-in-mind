import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, Sun, Moon, Monitor, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';

export default function ThemeSettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const themes = [
    { id: 'system', name: 'System Default', icon: Monitor },
    { id: 'light', name: 'Light Mode', icon: Sun },
    { id: 'dark', name: 'Dark Mode', icon: Moon },
    { id: 'amoled', name: 'AMOLED (Pure Black)', icon: EyeOff },
  ];

  const handleSelect = (id) => {
    setTheme(id);
    triggerHaptic();
  };

  return (
    <div className="min-h-full bg-[#FCF7ED] dark:bg-neutral-900 pb-28 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-5 sticky top-0 z-10 glass border-b border-outline-variant/20">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-outline-variant/20 text-on-surface hover:bg-surface-container active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-on-surface tracking-tight">Appearance</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 space-y-4">
        <p className="text-sm text-on-surface-variant font-medium ml-1">
          Choose a theme that best suits your eyes.
        </p>
        <div className="space-y-3">
          {themes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  theme === t.id
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-white dark:bg-neutral-800 border-outline-variant/20 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${theme === t.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    <Icon size={18} strokeWidth={2} />
                  </div>
                  <span className={`font-bold ${theme === t.id ? 'text-primary' : 'text-on-surface'}`}>
                    {t.name}
                  </span>
                </div>
                {theme === t.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
