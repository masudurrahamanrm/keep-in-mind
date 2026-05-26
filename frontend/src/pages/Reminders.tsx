import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bell, Trash2, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/Sidebar';
import { format, isPast, parseISO } from 'date-fns';

export default function Reminders() {
  const { user } = useAuth();
  const storageKey = user ? `keep-in-mind-reminders-${user._id}` : 'keep-in-mind-reminders-guest';

  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Doctor appointment', time: new Date(Date.now() + 86400000).toISOString() },
      { id: 2, text: 'Call mom', time: new Date(Date.now() + 3600000 * 5).toISOString() },
    ];
  });
  
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reminders));
  }, [reminders, storageKey]);

  const handleAddReminder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newReminderText.trim() || !newReminderTime) return;
    
    setReminders([{
      id: Date.now(),
      text: newReminderText.trim(),
      time: new Date(newReminderTime).toISOString()
    }, ...reminders].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()));
    
    setNewReminderText('');
    setNewReminderTime('');
  };

  const deleteReminder = (id: number) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pb-28 pt-2">
      
      {/* HEADER BANNER */}
      <div className="w-full bg-[#FEF7D6] dark:from-[#2C2415] dark:to-[#42361C] rounded-[28px] p-6 mb-8 relative overflow-hidden shadow-sm shrink-0" style={{height:'144px'}}>
        <div className="relative z-10 w-2/3">
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-amber-100 leading-tight mb-1 flex items-center gap-2">
            Reminders <Bell size={20} className="text-[#FFC107] fill-[#FFC107] animate-wiggle" />
          </h2>
          <p className="text-sm text-gray-600 dark:text-amber-200/80">
            You have {reminders.filter(r => !isPast(parseISO(r.time))).length} upcoming
          </p>
        </div>
        {/* Decorative glow */}
        <div className="absolute right-[-10px] bottom-[-20px] w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl pointer-events-none" />
        
        {/* Floating Bell Icon */}
        <div className="absolute right-4 bottom-2 w-24 h-24 flex items-center justify-center opacity-80 pointer-events-none">
          <Bell size={80} className="text-[#FFC107] fill-[#FFC107]/20 drop-shadow-lg" strokeWidth={1} />
        </div>
      </div>

      {/* ADD REMINDER INPUTS */}
      <form onSubmit={handleAddReminder} className="mb-8 space-y-3">
        <div className="relative">
          <input 
            type="text"
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            placeholder="What to remind?"
            className="w-full bg-white dark:bg-[#1A1C20] border-none rounded-[20px] py-4 pl-5 pr-5 shadow-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#FFC107] outline-none"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="datetime-local"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              className="w-full bg-white dark:bg-[#1A1C20] border-none rounded-[16px] py-3 pl-11 pr-4 shadow-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#FFC107] outline-none text-sm"
            />
            <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <button 
            type="submit"
            disabled={!newReminderText.trim() || !newReminderTime}
            className="w-12 h-[48px] bg-[#FFC107] text-white rounded-[16px] flex items-center justify-center hover:bg-[#F5B000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </form>

      {/* REMINDERS LIST */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {reminders.map((reminder) => {
            const dateObj = parseISO(reminder.time);
            const past = isPast(dateObj);

            return (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-white dark:bg-[#1A1C20] rounded-[20px] p-4 shadow-sm border border-black/5 dark:border-white/5 flex flex-col justify-center group relative overflow-hidden transition-all",
                  past ? "opacity-60" : ""
                )}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className={cn(
                      "text-[15px] font-semibold mb-1.5",
                      past ? "text-gray-500 line-through" : "text-gray-800 dark:text-gray-100"
                    )}>
                      {reminder.text}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-[#FF9E4A] dark:text-[#F3A83B]">
                      <Clock size={13} strokeWidth={2.5} />
                      {format(dateObj, "MMM d, h:mm a")}
                      {past && <span className="ml-2 text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 rounded-full text-[10px] uppercase">Passed</span>}
                    </div>
                  </div>

                  <button 
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-all shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {/* Visual marker left */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  past ? "bg-gray-300 dark:bg-gray-700" : "bg-[#FFC107]"
                )} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {reminders.length === 0 && (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[#FFF9EA] dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4 border border-[#FFC107]/20">
              <Bell size={28} className="text-[#FFC107]" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No Reminders</h4>
            <p className="text-xs text-gray-500">You don't have any upcoming events.</p>
          </div>
        )}
      </div>

    </div>
  );
}
