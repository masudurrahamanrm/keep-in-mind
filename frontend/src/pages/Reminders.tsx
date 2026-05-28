import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Bell, Clock, Calendar, Stethoscope, Phone, 
  BookOpen, Flag, MoreVertical, RotateCw, ListFilter, 
  Moon, CheckCircle2, Flame, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/Sidebar';
import { format, isPast, isToday, isTomorrow, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export type ReminderCategory = 'Health' | 'Personal' | 'Education' | 'Work' | 'Other';
export type ReminderPriority = 'Normal' | 'High Priority';
export type ReminderRepeat = 'Does not repeat' | 'Daily' | 'Weekly' | 'Monthly';
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
    default: return <Bell size={20} className="text-gray-400" />;
  }
};

const getCategoryColor = (category: ReminderCategory, isSnoozed: boolean) => {
  if (isSnoozed) return 'bg-purple-50 dark:bg-purple-900/20';
  switch (category) {
    case 'Health': return 'bg-orange-50 dark:bg-orange-900/20';
    case 'Personal': return 'bg-yellow-50 dark:bg-yellow-900/20';
    case 'Education': return 'bg-blue-50 dark:bg-blue-900/20';
    default: return 'bg-gray-50 dark:bg-gray-800';
  }
};

export default function Reminders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const storageKey = user ? `keep-in-mind-reminders-v2-${user._id}` : 'keep-in-mind-reminders-v2-guest';

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Doctor appointment', time: new Date(new Date().setHours(18, 40)).toISOString(), category: 'Health', priority: 'High Priority', repeat: 'Does not repeat', completed: false },
      { id: 2, text: 'Call mom', time: new Date(new Date().setHours(19, 40)).toISOString(), category: 'Personal', priority: 'Normal', repeat: 'Does not repeat', completed: false },
      { id: 3, text: 'Take medication', time: new Date(new Date().getTime() + 86400000).toISOString(), category: 'Health', priority: 'High Priority', repeat: 'Daily', completed: false },
      { id: 4, text: 'Study for exam', time: new Date(new Date().getTime() + 86400000).toISOString(), category: 'Education', priority: 'Normal', repeat: 'Does not repeat', completed: false },
      { id: 5, text: 'Morning workout', time: new Date(new Date().setHours(7, 0)).toISOString(), category: 'Health', priority: 'Normal', repeat: 'Daily', completed: false, snoozedUntil: new Date(new Date().setHours(9, 0)).toISOString() },
    ];
  });
  
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

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
      category: 'Other',
      priority: 'Normal',
      repeat: 'Does not repeat',
      completed: false
    }, ...reminders].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()));
    
    setNewReminderText('');
    setNewReminderTime('');
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

  // Stats
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const totalUpcoming = reminders.filter(r => !r.completed && !r.snoozedUntil).length;
  const totalCompleted = reminders.filter(r => r.completed).length;
  const completedThisWeek = reminders.filter(r => r.completed && isWithinInterval(parseISO(r.time), { start: weekStart, end: weekEnd })).length;

  // Filtering
  const filteredReminders = reminders.filter(r => {
    if (activeTab === 'Completed') return r.completed;
    if (activeTab === 'Snoozed') return r.snoozedUntil && !r.completed;
    if (activeTab === 'Upcoming') return !r.completed && !r.snoozedUntil;
    return true; // All
  }).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

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
      
      {/* HEADER BANNER */}
      <div className="w-full bg-[#FFF9E5] dark:from-[#2C2415] dark:to-[#42361C] rounded-[24px] p-6 relative overflow-hidden shadow-sm shrink-0">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="w-full md:w-1/2">
            <h2 className="text-[22px] font-bold text-gray-900 dark:text-amber-100 leading-tight mb-1 flex items-center gap-2">
              Good morning, {user?.name?.split(' ')[0] || 'User'}! <span className="text-xl">👋</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-amber-200/80 mb-6">
              You have {totalUpcoming} upcoming reminders today.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-bold mb-1">
                  {reminders.length}
                </div>
                <span className="text-xs text-gray-500 font-medium">Total</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold mb-1">
                  {totalCompleted}
                </div>
                <span className="text-xs text-gray-500 font-medium">Completed</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold mb-1">
                  {completedThisWeek}
                </div>
                <span className="text-xs text-gray-500 font-medium">This week</span>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex absolute right-0 top-0 bottom-0 w-1/2 items-center justify-end pr-4 pointer-events-none opacity-90">
             <div className="relative w-32 h-32">
                <div className="absolute right-8 top-4 w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-[40%] rotate-12 blur-[1px] shadow-lg flex items-center justify-center">
                  <Bell size={40} className="text-white fill-white" />
                </div>
                <div className="absolute right-0 bottom-4 w-16 h-16 bg-white dark:bg-gray-800 rounded-xl -rotate-6 shadow-xl flex items-center justify-center border border-gray-100 dark:border-gray-700">
                  <Calendar size={28} className="text-blue-500" />
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rotate-45" />
                <div className="absolute bottom-8 right-28 w-1.5 h-1.5 bg-orange-400 rotate-45" />
             </div>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {(['All', 'Upcoming', 'Completed', 'Snoozed'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab 
                ? "bg-yellow-50 dark:bg-yellow-900/20 text-[#FFC107] border border-[#FFC107]/30" 
                : "bg-white dark:bg-[#1A1C20] text-gray-600 dark:text-gray-300 border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            {tab === 'All' && <ListFilter size={14} />}
            {tab === 'Upcoming' && <Clock size={14} />}
            {tab === 'Completed' && <CheckCircle2 size={14} />}
            {tab === 'Snoozed' && <Moon size={14} />}
            {tab}
          </button>
        ))}
        <div className="flex-1" />
        <button className="p-2 bg-white dark:bg-[#1A1C20] text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ListFilter size={18} />
        </button>
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
                    <button className="text-xs font-semibold text-[#FFC107] hover:underline">View all</button>
                  </div>
                )}
                <AnimatePresence>
                  {list.map(reminder => (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-[#1A1C20] rounded-[20px] p-4 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", getCategoryColor(reminder.category, !!reminder.snoozedUntil))}>
                          {getCategoryIcon(reminder.category, !!reminder.snoozedUntil)}
                        </div>
                        <div className="flex flex-col">
                          <h4 className={cn(
                            "text-[15px] font-bold mb-0.5",
                            reminder.completed ? "text-gray-400 line-through" : "text-gray-900 dark:text-gray-100"
                          )}>
                            {reminder.text}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            <Clock size={12} className={reminder.snoozedUntil ? "text-purple-400" : "text-[#FFC107]"} />
                            {formatTimeText(reminder.time)}
                            
                            {reminder.snoozedUntil && (
                              <span className="ml-1 text-purple-500">
                                Snoozed until {formatTimeText(reminder.snoozedUntil)}
                              </span>
                            )}
                            
                            {reminder.repeat !== 'Does not repeat' && !reminder.snoozedUntil && (
                              <span className="flex items-center gap-1 ml-2">
                                <RotateCw size={10} /> {reminder.repeat}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mt-0.5">
                            {reminder.priority === 'High Priority' && (
                              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                High Priority
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded-md uppercase tracking-wider">
                              {reminder.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {reminder.snoozedUntil ? (
                          <button 
                            onClick={() => undoSnooze(reminder.id)}
                            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 text-xs font-bold rounded-full hover:bg-purple-100 transition-colors"
                          >
                            Undo
                          </button>
                        ) : (
                          <button 
                            onClick={() => toggleComplete(reminder.id)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-green-500 rounded-full transition-colors"
                            title="Mark as completed"
                          >
                            <CheckCircle2 size={18} className={reminder.completed ? "fill-green-100 text-green-500" : ""} />
                          </button>
                        )}
                        <button 
                          onClick={() => deleteReminder(reminder.id)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full transition-colors"
                          title="Delete reminder"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          };

          if (activeTab === 'All') {
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
            return renderCards(filteredReminders);
          }
        })()}
      </div>

      {/* STREAK BANNER */}
      <div className="bg-[#FFF9E5] dark:bg-yellow-900/10 rounded-[20px] p-4 flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-[#1A1C20] rounded-full shadow-sm flex items-center justify-center shrink-0">
            <Flame size={20} className="text-orange-500 fill-orange-500" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1">
              You're on a streak! <Flame size={14} className="text-orange-500 fill-orange-500" />
            </h4>
            <p className="text-[11px] text-gray-500">Great job staying consistent.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px]",
                  i < 5 ? "bg-[#FFC107] text-white" : "bg-yellow-200 text-yellow-600"
                )}>
                  {i < 5 && <CheckCircle2 size={12} strokeWidth={3} />}
                </div>
                <span className="text-[9px] font-bold text-gray-400">{day}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center sm:pl-3 sm:border-l border-yellow-200 dark:border-yellow-900/50">
            <span className="text-lg font-black text-gray-900 dark:text-gray-100 leading-none">12</span>
            <span className="text-[9px] font-bold text-gray-500 uppercase">Day<br/>streak</span>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={() => navigate('/reminders/new')}
        className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-[#FFC107] text-white rounded-full flex items-center justify-center hover:bg-[#F5B000] hover:scale-105 transition-all shadow-lg z-50 group"
        title="Add Reminder"
      >
        <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

    </div>
  );
}
