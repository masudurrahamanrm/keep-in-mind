import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

export default function ThemeColorSettings() {
  const navigate = useNavigate();
  const { themeColor, setThemeColor, triggerHaptic } = usePreferences();

  const colors = [
    { id: 'yellow', name: 'Yellow (Default)', hex: '#FBC02D' },
    { id: 'blue', name: 'Vibrant Blue', hex: '#007AFF' },
    { id: 'green', name: 'Emerald Green', hex: '#34C759' },
    { id: 'purple', name: 'Royal Purple', hex: '#AF52DE' },
  ];

  const handleSelect = (id) => {
    setThemeColor(id);
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
        <h1 className="text-xl font-black text-on-surface tracking-tight">Theme Color</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 space-y-4">
        <p className="text-sm text-on-surface-variant font-medium ml-1">
          Choose a primary color for your KeepInMind experience.
        </p>
        <div className="space-y-3">
          {colors.map((color) => (
            <button
              key={color.id}
              onClick={() => handleSelect(color.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                themeColor === color.id
                  ? 'bg-primary/10 border-primary shadow-sm'
                  : 'bg-white dark:bg-neutral-800 border-outline-variant/20 hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: color.hex }} />
                <span className={`font-bold ${themeColor === color.id ? 'text-primary' : 'text-on-surface'}`}>
                  {color.name}
                </span>
              </div>
              {themeColor === color.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
