import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, RotateCw, Flag, Plus, ArrowLeft, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import CustomDatePicker from '../components/CustomDatePicker';

export default function AddReminder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [repeat, setRepeat] = useState('Does not repeat');
  const [priority, setPriority] = useState('Normal');
  const [category, setCategory] = useState('Personal');

  const handleAddReminder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newReminderText.trim() || !newReminderTime) return;
    
    const storageKey = user ? `keep-in-mind-reminders-v2-${user._id}` : 'keep-in-mind-reminders-v2-guest';
    const saved = localStorage.getItem(storageKey);
    const reminders = saved ? JSON.parse(saved) : [];
    
    const newReminder = {
      id: Date.now(),
      text: newReminderText.trim(),
      time: new Date(newReminderTime).toISOString(),
      category: category,
      priority: priority,
      repeat: repeat,
      completed: false
    };

    reminders.push(newReminder);
    reminders.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
    localStorage.setItem(storageKey, JSON.stringify(reminders));
    
    navigate('/reminders');
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pt-2 pb-28 space-y-6">
      
      <div className="bg-white dark:bg-[#1A1C20] rounded-[24px] p-6 shadow-sm border border-black/5 dark:border-white/5 space-y-6 mt-4">
        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            What do you want to be reminded of?
          </label>
          <input 
            type="text"
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            placeholder="e.g. Doctor's appointment, Call mom..."
            autoFocus
            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#FFC107] p-4 outline-none text-base transition-shadow"
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
            Details
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date & Time */}
            <div className="relative">
              <button 
                onClick={() => setShowDatePicker(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors border border-black/5 dark:border-white/5"
              >
                <Calendar size={16} />
                {newReminderTime ? format(parseISO(newReminderTime), 'MMM d, h:mm a') : 'Select Date & Time'}
              </button>
            </div>
            
            {/* Repeat */}
            <div className="relative">
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              >
                <option value="Does not repeat">Does not repeat</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors border border-black/5 dark:border-white/5">
                <RotateCw size={16} /> {repeat}
              </button>
            </div>
            
            {/* Priority */}
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              >
                <option value="Normal">Normal Priority</option>
                <option value="High Priority">High Priority</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors border border-black/5 dark:border-white/5">
                <Flag size={16} className={priority === 'High Priority' ? "text-red-500 fill-red-500" : ""} /> 
                {priority === 'Normal' ? 'Add priority' : priority}
              </button>
            </div>

            {/* Category */}
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              >
                <option value="Personal">Personal</option>
                <option value="Health">Health</option>
                <option value="Education">Education</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors border border-black/5 dark:border-white/5">
                <Tag size={16} /> {category}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleAddReminder}
            disabled={!newReminderText.trim() || !newReminderTime}
            className="flex items-center gap-2 px-6 py-3 bg-[#FFC107] text-white rounded-xl font-bold hover:bg-[#F5B000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Save Reminder
          </button>
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
