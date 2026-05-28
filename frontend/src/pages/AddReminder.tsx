import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RotateCw, Flag, Plus, ArrowLeft, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomDropdown from '../components/CustomDropdown';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function AddReminder() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [repeat, setRepeat] = useState('Does not repeat');
  const [priority, setPriority] = useState('Normal');
  const [category, setCategory] = useState('Personal');
  const [saving, setSaving] = useState(false);

  const handleAddReminder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newReminderText.trim() || !newReminderTime) return;

    setSaving(true);

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/reminders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            text: newReminderText.trim(),
            time: new Date(newReminderTime).toISOString(),
            category,
            priority,
            repeat
          })
        });
        if (res.ok) {
          navigate('/reminders');
        }
      } catch (error) {
        console.error('Error adding reminder:', error);
      } finally {
        setSaving(false);
      }
    } else {
      // Guest mode fallback
      const storageKey = user ? `keep-in-mind-reminders-v2-${user._id}` : 'keep-in-mind-reminders-v2-guest';
      const saved = localStorage.getItem(storageKey);
      const reminders = saved ? JSON.parse(saved) : [];
      
      reminders.push({
        id: Date.now(),
        text: newReminderText.trim(),
        time: new Date(newReminderTime).toISOString(),
        category,
        priority,
        repeat,
        completed: false
      });
      reminders.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
      localStorage.setItem(storageKey, JSON.stringify(reminders));
      navigate('/reminders');
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
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            placeholder="What do you need to remember?"
            autoFocus
            className="w-full bg-transparent border-none text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:ring-0 p-0 outline-none transition-shadow"
          />

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Details
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Date & Time */}
              <div className="relative">
                <button 
                  onClick={() => setShowDatePicker(true)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm border
                    ${newReminderTime 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700/50'}`}
                >
                  <Calendar size={16} />
                  {newReminderTime ? format(parseISO(newReminderTime), 'MMM d, h:mm a') : 'Select Date'}
                </button>
              </div>
              
              {/* Repeat */}
              <CustomDropdown
                value={repeat}
                onChange={setRepeat}
                options={['Does not repeat', 'Daily', 'Weekly', 'Monthly']}
                trigger={
                  <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm border pointer-events-none
                    ${repeat !== 'Does not repeat' 
                      ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/50'}`}
                  >
                    <RotateCw size={16} /> {repeat === 'Does not repeat' ? 'Repeat' : repeat}
                  </button>
                }
              />
              
              {/* Priority */}
              <CustomDropdown
                value={priority}
                onChange={setPriority}
                options={['Normal', 'High Priority']}
                trigger={
                  <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm border pointer-events-none
                    ${priority !== 'Normal' 
                      ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/50'}`}
                  >
                    <Flag size={16} /> {priority === 'Normal' ? 'Priority' : priority}
                  </button>
                }
              />

              {/* Category */}
              <CustomDropdown
                value={category}
                onChange={setCategory}
                options={['Personal', 'Health', 'Education', 'Work', 'Other']}
                trigger={
                  <button className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm border pointer-events-none
                    ${category !== 'Personal' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700/50'}`}
                  >
                    <Tag size={16} /> {category}
                  </button>
                }
              />
            </div>
          </div>

          <div className="pt-8">
            <button 
              onClick={handleAddReminder}
              disabled={!newReminderText.trim() || !newReminderTime || saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#FFC107] to-[#FF9800] text-white rounded-2xl font-bold text-lg hover:from-[#F5B000] hover:to-[#F57C00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FFC107]/30 transform active:scale-[0.98]"
            >
              <Plus size={20} strokeWidth={3} /> {saving ? 'Saving...' : 'Save Reminder'}
            </button>
          </div>
        </div>
      </div>

      {showDatePicker && (
        <CustomDatePicker 
          value={newReminderTime} 
          onChange={setNewReminderTime} 
          onClose={() => setShowDatePicker(false)} 
        />
      )}
    </div>
  );
}
