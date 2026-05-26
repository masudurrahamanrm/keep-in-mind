import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/Sidebar';

export default function Tasks() {
  const { user } = useAuth();
  const storageKey = user ? `keep-in-mind-tasks-${user._id}` : 'keep-in-mind-tasks-guest';

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Design the new onboarding flow', completed: true },
      { id: 2, text: 'Review pull requests', completed: false },
      { id: 3, text: 'Update dependencies', completed: false },
    ];
  });
  
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks, storageKey]);

  const handleAddTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.trim()) return;
    
    setTasks([{
      id: Date.now(),
      text: newTask.trim(),
      completed: false
    }, ...tasks]);
    setNewTask('');
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pb-28 pt-2">
      
      {/* HEADER BANNER */}
      <div className="w-full bg-[#FEF7D6] dark:from-[#2C2415] dark:to-[#42361C] rounded-[28px] p-6 mb-8 relative overflow-hidden shadow-sm shrink-0" style={{height:'144px'}}>
        <div className="relative z-10 w-2/3">
          <h2 className="text-[22px] font-bold text-gray-900 dark:text-amber-100 leading-tight mb-1">
            Your Tasks 📝
          </h2>
          <p className="text-sm text-gray-600 dark:text-amber-200/80">
            {completedCount} of {tasks.length} completed
          </p>
        </div>
        {/* Decorative glow */}
        <div className="absolute right-[-10px] bottom-[-20px] w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl pointer-events-none" />
        {/* Progress Circle Visual */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-8 border-white/40 flex items-center justify-center">
            <span className="font-bold text-gray-800 text-lg">
                {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
            </span>
        </div>
      </div>

      {/* ADD TASK INPUT */}
      <form onSubmit={handleAddTask} className="mb-6 relative">
        <input 
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          className="w-full bg-white dark:bg-[#1A1C20] border-none rounded-[20px] py-4 pl-5 pr-14 shadow-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-[#FFC107] outline-none"
        />
        <button 
          type="submit"
          disabled={!newTask.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FFC107] text-white rounded-[14px] flex items-center justify-center hover:bg-[#F5B000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </form>

      {/* TASKS LIST */}
      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1C20] rounded-[20px] p-4 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between group"
            >
              <div 
                className="flex items-center gap-4 flex-1 cursor-pointer"
                onClick={() => toggleTask(task.id)}
              >
                <button className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                  task.completed 
                    ? "bg-[#FFC107] text-white" 
                    : "border-2 border-gray-300 dark:border-gray-600 text-transparent hover:border-[#FFC107]"
                )}>
                  <Check size={14} strokeWidth={4} />
                </button>
                <span className={cn(
                  "text-sm font-medium transition-all",
                  task.completed 
                    ? "text-gray-400 dark:text-gray-500 line-through" 
                    : "text-gray-800 dark:text-gray-200"
                )}>
                  {task.text}
                </span>
              </div>
              
              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tasks.length === 0 && (
          <div className="py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Check size={30} className="text-gray-400" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">All done!</h4>
            <p className="text-xs text-gray-500">You have no pending tasks.</p>
          </div>
        )}
      </div>

    </div>
  );
}
