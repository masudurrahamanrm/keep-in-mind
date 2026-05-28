import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Bell, Clock, Calendar, Stethoscope, Phone, 
  BookOpen, Flag, MoreVertical, RotateCw, ListFilter, 
  Moon, CheckCircle2, Flame, Trash2, Search, SlidersHorizontal, Tag, Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/Sidebar';
import { format, isPast, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export type ReminderCategory = 'Health' | 'Personal' | 'Education' | 'Work' | 'Other';
export type ReminderPriority = 'Normal' | 'Low' | 'Medium' | 'High Priority';
export type ReminderRepeat = 'Once' | 'Daily' | 'Weekly' | 'Monthly';
export type FilterTab = 'All' | 'Upcoming' | 'Completed' | 'Snoozed';

export interface Reminder {
  id: number;
  text: string;
  time: string;
  category: ReminderCategory;
  priority: ReminderPriority;
  repeat: ReminderRepeat;
  completed: boolean;
  snoozedUntil?: string;
}

const getCategoryIcon = (category: ReminderCategory, isSnoozed: boolean) => {
  if (isSnoozed) return <Moon size={20} className="text-purple-500" />;
  switch (category) {
    case 'Health': return <Stethoscope size={20} className="text-[#FF9E4A]" />;
    case 'Personal': return <Phone size={20} className="text-[#FFC107]" />;
    case 'Education': return <BookOpen size={20} className="text-blue-400" />;
    case 'Work': return <Briefcase size={20} className="text-teal-500" />;
    default: return <Bell size={20} className="text-gray-400" />;
  }
};

const getCategoryColor = (category: ReminderCategory, isSnoozed: boolean) => {
  if (isSnoozed) return 'bg-purple-50 dark:bg-purple-900/20';
  switch (category) {
    case 'Health': return 'bg-orange-50 dark:bg-orange-900/20';
    case 'Personal': return 'bg-yellow-50 dark:bg-yellow-900/20';
    case 'Education': return 'bg-blue-50 dark:bg-blue-900/20';
    case 'Work': return 'bg-teal-50 dark:bg-teal-900/20';
    default: return 'bg-gray-50 dark:bg-gray-800';
  }
};

export default function Reminders() {
  const { user } = useAuth();
  const storageKey = user ? `keep-in-mind-reminders-v3-${user._id}` : 'keep-in-mind-reminders-v3-guest';

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Doctor appointment', time: new Date(new Date().setHours(18, 40)).toISOString(), category: 'Health', priority: 'High Priority', repeat: 'Once', completed: false },
      { id: 2, text: 'Call mom', time: new Date(new Date().setHours(19, 40)).toISOString(), category: 'Personal', priority: 'Medium', repeat: 'Once', completed: false },
      { id: 3, text: 'Take medication', time: new Date(new Date().getTime() + 86400000).toISOString(), category: 'Health', priority: 'High Priority', repeat: 'Daily', completed: false },
      { id: 4, text: 'Study for exam', time: new Date(new Date().getTime() + 86400000).toISOString(), category: 'Education', priority: 'Normal', repeat: 'Once', completed: false },
      { id: 5, text: 'Morning workout', time: new Date(new Date().setHours(7, 0)).toISOString(), category: 'Health', priority: 'Normal', repeat: 'Daily', completed: false, snoozedUntil: new Date(new Date().setHours(9, 0)).toISOString() },
    ];
  });
  
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newCategory, setNewCategory] = useState<ReminderCategory>('Other');
  const [newPriority, setNewPriority] = useState<ReminderPriority>('Normal');
  const [newRepeat, setNewRepeat] = useState<ReminderRepeat>('Once');

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reminders));
  }, [reminders, storageKey]);

  const handleAddReminder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newReminderText.trim() || !newReminderTime) return;
    
    setReminders([{
      id: Date.now(),
      text: newReminderText.trim(),
      time: new Date(newReminderTime).toISOString(),
      category: newCategory,
      priority: newPriority,
      repeat: newRepeat,
      completed: false
    }, ...reminders].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()));
    
    setNewReminderText('');
    setNewReminderTime('');
    setNewCategory('Other');
    setNewPriority('Normal');
    setNewRepeat('Once');
  };

  const toggleComplete = (id: number) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };
  
  const deleteReminder = (id: number) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const undoSnooze = (id: number) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, snoozedUntil: undefined } : r));
  };

  const handleSnooze = (id: number) => {
    const snoozeTime = new Date();
    snoozeTime.setHours(snoozeTime.getHours() + 1); // Snooze for 1 hour
    setReminders(reminders.map(r => r.id === id ? { ...r, snoozedUntil: snoozeTime.toISOString() } : r));
  };

  // Stats
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const totalUpcoming = reminders.filter(r => !r.completed && !r.snoozedUntil).length;
  const totalCompleted = reminders.filter(r => r.completed).length;
  const completedThisWeek = reminders.filter(r => r.completed && isWithinInterval(parseISO(r.time), { start: weekStart, end: weekEnd })).length;

  // Filtering
  let filteredReminders = reminders.filter(r => {
    if (activeTab === 'Completed') return r.completed;
    if (activeTab === 'Snoozed') return r.snoozedUntil && !r.completed;
    if (activeTab === 'Upcoming') return !r.completed && !r.snoozedUntil;
    return true; // All
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredReminders = filteredReminders.filter(r => r.text.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }

  if (isFocusMode) {
    filteredReminders = filteredReminders.filter(r => !r.completed);
  }

  const todayReminders = filteredReminders.filter(r => isToday(parseISO(r.time)) && !r.snoozedUntil && !r.completed);
  const upcomingReminders = filteredReminders.filter(r => !isToday(parseISO(r.time)) && !r.snoozedUntil && !r.completed);
  const snoozedReminders = filteredReminders.filter(r => r.snoozedUntil && !r.completed);

  const formatTimeText = (isoString: string) => {
    const date = parseISO(isoString);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pb-28 pt-2 space-y-6">
      
      {/* FAB for Mobile */}
      <button 
        onClick={() => document.getElementById('reminder-input')?.focus()}
        className="md:hidden fixed bottom-[90px] right-6 w-14 h-14 bg-gradient-to-br from-[#FFC107] to-[#FF9E4A] rounded-full shadow-[0_8px_30px_rgb(255,193,7,0.4)] flex items-center justify-center text-white z-50 hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      {/* HEADER BANNER */}
      <div className="w-full bg-white/40 dark:bg-[#2C2415]/40 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[24px] p-6 relative overflow-hidden shadow-sm shrink-0">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#FFC107] rounded-full mix-blend-multiply dark:mix-blend-overlay filter blur-[80px] opacity-40 animate-pulse-slow"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="w-full md:w-1/2">
            <h2 className="text-[22px] font-bold text-gray-900 dark:text-amber-100 leading-tight mb-1 flex items-center gap-2">
              Good morning, {user?.name?.split(' ')[0] || 'User'}! <span className="text-xl">👋</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-amber-200/80 mb-6">
              You have {totalUpcoming} pending tasks today.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-100/80 dark:bg-yellow-900/40 backdrop-blur-md flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-bold mb-1 shadow-sm">
                  {reminders.length}
                </div>
                <span className="text-xs text-gray-500 font-medium">Total</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-100/80 dark:bg-green-900/40 backdrop-blur-md flex items-center justify-center text-green-600 dark:text-green-400 font-bold mb-1 shadow-sm">
                  {totalCompleted}
                </div>
                <span className="text-xs text-gray-500 font-medium">Completed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-100/80 dark:bg-purple-900/40 backdrop-blur-md flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold mb-1 shadow-sm">
                  {totalUpcoming}
                </div>
                <span className="text-xs text-gray-500 font-medium">Pending</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-1/2 items-center justify-end pr-4 pointer-events-none opacity-90">
             <div className="relative w-32 h-32">
                <div className="absolute right-8 top-4 w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-[40%] rotate-12 blur-[0.5px] shadow-[0_10px_40px_rgb(255,193,7,0.6)] flex items-center justify-center">
                  <Bell size={40} className="text-white fill-white" />
                </div>
                <div className="absolute right-0 bottom-4 w-16 h-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl -rotate-6 shadow-xl flex items-center justify-center border border-white dark:border-gray-700">
                  <Calendar size={28} className="text-blue-500" />
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rotate-45 rounded-sm shadow-sm" />
                <div className="absolute bottom-8 right-28 w-1.5 h-1.5 bg-orange-400 rotate-45 rounded-sm shadow-sm" />
             </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FOCUS MODE */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search reminders..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/60 dark:bg-[#1A1C20]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 rounded-[20px] py-3 pl-11 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-[#FFC107] outline-none text-gray-800 dark:text-gray-100"
          />
        </div>
        <button 
          onClick={() => setIsFocusMode(!isFocusMode)}
          className={cn(
            "p-3 rounded-[20px] transition-colors border shadow-sm backdrop-blur-xl",
            isFocusMode 
              ? "bg-[#FFC107] text-white border-[#FFC107]" 
              : "bg-white/60 dark:bg-[#1A1C20]/60 border-white/40 dark:border-white/5 text-gray-600 dark:text-gray-300"
          )}
          title="Focus Mode (Hide completed)"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* INPUT SECTION */}
      <div className="bg-white/60 dark:bg-[#1A1C20]/60 backdrop-blur-xl rounded-[24px] p-4 shadow-sm border border-white/40 dark:border-white/5 space-y-3 relative z-20">
        <input 
          id="reminder-input"
          type="text"
          value={newReminderText}
          onChange={(e) => setNewReminderText(e.target.value)}
          placeholder="What do you want to be reminded of?"
          className="w-full bg-transparent border-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-0 outline-none text-[15px]"
        />
        
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          {/* Custom Selects using native options for reliability but styled with glassmorphism */}
          <div className="relative group">
            <input 
              type="datetime-local"
              value={newReminderTime}
              onChange={(e) => setNewReminderTime(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-white/50 dark:border-white/5 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors">
              <Calendar size={14} />
              {newReminderTime ? format(parseISO(newReminderTime), 'MMM d, h:mm a') : 'Today, 10:00 AM'}
            </div>
          </div>
          
          <div className="relative">
            <select
              value={newRepeat}
              onChange={(e) => setNewRepeat(e.target.value as ReminderRepeat)}
              className="appearance-none pl-7 pr-8 py-1.5 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-white/50 dark:border-white/5 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors focus:ring-0 cursor-pointer outline-none"
            >
              <option value="Once">Once</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <RotateCw size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          
          <div className="relative">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as ReminderPriority)}
              className="appearance-none pl-7 pr-8 py-1.5 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-white/50 dark:border-white/5 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors focus:ring-0 cursor-pointer outline-none"
            >
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High Priority">High</option>
            </select>
            <Flag size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as ReminderCategory)}
              className="appearance-none pl-7 pr-8 py-1.5 bg-white/50 dark:bg-gray-800/50 hover:bg-white/80 dark:hover:bg-gray-700/80 border border-white/50 dark:border-white/5 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors focus:ring-0 cursor-pointer outline-none"
            >
              <option value="Other">Other</option>
              <option value="Health">Health</option>
              <option value="Personal">Personal</option>
              <option value="Education">Education</option>
              <option value="Work">Work</option>
            </select>
            <Tag size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          
          <div className="flex-1" />
          
          <button 
            onClick={handleAddReminder}
            disabled={!newReminderText.trim() || !newReminderTime}
            className="hidden md:flex w-8 h-8 bg-gradient-to-br from-[#FFC107] to-[#FF9E4A] text-white rounded-lg items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-md"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {(['All', 'Upcoming', 'Completed', 'Snoozed'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shadow-sm backdrop-blur-md",
              activeTab === tab 
                ? "bg-yellow-50/90 dark:bg-yellow-900/30 text-[#FFC107] border border-[#FFC107]/40" 
                : "bg-white/60 dark:bg-[#1A1C20]/60 text-gray-600 dark:text-gray-300 border border-white/40 dark:border-white/5 hover:bg-white/80 dark:hover:bg-gray-800/80"
            )}
          >
            {tab === 'All' && <ListFilter size={14} />}
            {tab === 'Upcoming' && <Clock size={14} />}
            {tab === 'Completed' && <CheckCircle2 size={14} />}
            {tab === 'Snoozed' && <Moon size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* REMINDERS LIST */}
      <div className="flex flex-col gap-6">
        {(() => {
          const renderCards = (list: Reminder[], title?: string) => {
            if (list.length === 0) return null;
            return (
              <div className="flex flex-col gap-3">
                {title && (
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#FFC107] rounded-full" />
                      <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                    </div>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {list.map(reminder => (
                    <div key={reminder.id} className="relative overflow-hidden rounded-[20px] group">
                      
                      {/* Swipe Actions Background */}
                      <div className="absolute inset-0 flex items-center justify-between px-6 bg-gradient-to-r from-green-500 via-gray-100 dark:via-gray-800 to-red-500 rounded-[20px] z-0">
                        <div className="flex items-center text-white font-bold gap-2">
                          <CheckCircle2 size={24} /> <span className="hidden sm:inline">Complete</span>
                        </div>
                        <div className="flex items-center text-white font-bold gap-2">
                          <span className="hidden sm:inline">Delete</span> <Trash2 size={24} />
                        </div>
                      </div>

                      {/* Foreground Draggable Card */}
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset }) => {
                          if (offset.x > 80) toggleComplete(reminder.id);
                          if (offset.x < -80) deleteReminder(reminder.id);
                        }}
                        whileDrag={{ scale: 1.02 }}
                        className="relative bg-white/80 dark:bg-[#1A1C20]/80 backdrop-blur-xl rounded-[20px] p-4 shadow-sm border border-white/50 dark:border-white/5 flex items-center justify-between gap-4 z-10 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/50 dark:border-transparent", getCategoryColor(reminder.category, !!reminder.snoozedUntil))}>
                            {getCategoryIcon(reminder.category, !!reminder.snoozedUntil)}
                          </div>
                          
                          <div className="flex flex-col min-w-0 flex-1">
                            <h4 className={cn(
                              "text-[15px] font-bold mb-0.5 truncate",
                              reminder.completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"
                            )}>
                              {reminder.text}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 truncate">
                              <Clock size={12} className={reminder.snoozedUntil ? "text-purple-400" : "text-[#FFC107]"} />
                              <span className="truncate">{formatTimeText(reminder.time)}</span>
                              
                              {reminder.snoozedUntil && (
                                <span className="ml-1 text-purple-500 truncate">
                                  Snoozed til {formatTimeText(reminder.snoozedUntil)}
                                </span>
                              )}
                              
                              {reminder.repeat !== 'Once' && !reminder.snoozedUntil && (
                                <span className="flex items-center gap-1 ml-2 shrink-0">
                                  <RotateCw size={10} /> {reminder.repeat}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-0.5 overflow-x-auto no-scrollbar">
                              {reminder.priority === 'High Priority' && (
                                <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-red-100 dark:border-red-900/30">
                                  High Priority
                                </span>
                              )}
                              {reminder.priority === 'Low' && (
                                <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-green-100 dark:border-green-900/30">
                                  Low Priority
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 border border-gray-200 dark:border-gray-700">
                                {reminder.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {reminder.snoozedUntil ? (
                            <button 
                              onClick={() => undoSnooze(reminder.id)}
                              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-xs font-bold rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                            >
                              Undo
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleSnooze(reminder.id)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-purple-500 rounded-full transition-colors hidden sm:flex"
                                title="Snooze for 1 hour"
                              >
                                <Moon size={18} />
                              </button>
                              <button 
                                onClick={() => toggleComplete(reminder.id)}
                                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-500 rounded-full transition-colors"
                                title="Mark as completed"
                              >
                                <CheckCircle2 size={18} className={reminder.completed ? "fill-green-100 text-green-500" : ""} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => deleteReminder(reminder.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full transition-colors md:hidden lg:flex"
                            title="Delete reminder"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            );
          };

          if (activeTab === 'All' && !searchQuery) {
            return (
              <>
                {renderCards(todayReminders, 'Today')}
                {renderCards(upcomingReminders, 'Upcoming')}
                {renderCards(snoozedReminders, 'Snoozed')}
                {reminders.length === 0 && (
                  <div className="py-12 flex flex-col items-center text-center">
                    <p className="text-gray-500">No Reminders yet.</p>
                  </div>
                )}
              </>
            );
          } else {
            return renderCards(filteredReminders, searchQuery ? 'Search Results' : undefined);
          }
        })()}
      </div>

      {/* STREAK BANNER */}
      <div className="bg-white/50 dark:bg-[#1A1C20]/50 backdrop-blur-xl border border-white/50 dark:border-white/5 rounded-[20px] p-4 flex items-center justify-between mt-4 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-yellow-100/50 dark:from-yellow-900/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm border border-white/50 dark:border-gray-700 flex items-center justify-center shrink-0">
            <Flame size={20} className="text-orange-500 fill-orange-500" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
              You're on a streak! <Flame size={14} className="text-orange-500 fill-orange-500" />
            </h4>
            <p className="text-[11px] text-gray-500">Great job staying consistent.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 shrink-0 relative z-10">
          <div className="hidden sm:flex items-center gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm",
                  i < 5 ? "bg-gradient-to-br from-[#FFC107] to-[#FF9E4A] text-white" : "bg-white/60 dark:bg-gray-800/60 text-gray-500 border border-white/50 dark:border-gray-700"
                )}>
                  {i < 5 && <CheckCircle2 size={12} strokeWidth={3} />}
                </div>
                <span className="text-[9px] font-bold text-gray-400">{day}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center sm:pl-3 sm:border-l border-gray-200 dark:border-gray-700">
            <span className="text-lg font-black text-gray-900 dark:text-gray-100 leading-none">12</span>
            <span className="text-[9px] font-bold text-gray-500 uppercase">Day<br/>streak</span>
          </div>
        </div>
      </div>

    </div>
  );
}
