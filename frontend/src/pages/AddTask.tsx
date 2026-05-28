import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function AddTask() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [taskText, setTaskText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskText.trim()) return;

    setSaving(true);

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ text: taskText.trim() })
        });
        if (res.ok) {
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Error adding task:', error);
      } finally {
        setSaving(false);
      }
    } else {
      // Guest mode
      const storageKey = user ? `keep-in-mind-tasks-${user._id}` : 'keep-in-mind-tasks-guest';
      const saved = localStorage.getItem(storageKey);
      const tasks = saved ? JSON.parse(saved) : [];
      tasks.unshift({
        id: Date.now(),
        text: taskText.trim(),
        completed: false
      });
      localStorage.setItem(storageKey, JSON.stringify(tasks));
      navigate('/tasks');
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pt-6 pb-28 space-y-6">
      
      <div className="bg-white/80 dark:bg-[#1A1C20]/80 backdrop-blur-xl rounded-[32px] p-6 sm:p-8 shadow-xl border border-gray-200/50 dark:border-white/5 relative overflow-hidden">
        
        {/* Subtle decorative gradient background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FFC107]/20 dark:bg-[#FFC107]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-8 relative z-10">
          <input 
            type="text"
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="What do you need to do?"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            className="w-full bg-transparent border-none text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-0 p-0 outline-none transition-shadow"
          />

          <div className="pt-4">
            <button 
              onClick={handleSave}
              disabled={!taskText.trim() || saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FFC107] to-[#FF9800] text-white rounded-2xl font-bold text-lg hover:from-[#F5B000] hover:to-[#F57C00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FFC107]/30 transform active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} /> {saving ? 'Saving...' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
