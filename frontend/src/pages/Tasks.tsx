import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../components/Sidebar';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface TaskType {
  id?: number | string;
  _id?: string;
  text: string;
  completed: boolean;
}

export default function Tasks() {
  const { user, token } = useAuth();
  const storageKey = user ? `keep-in-mind-tasks-${user._id}` : 'keep-in-mind-tasks-guest';

  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDeleteTaskId, setActiveDeleteTaskId] = useState<string | number | null>(null);

  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  // Load initial tasks
  useEffect(() => {
    const loadTasks = async () => {
      if (token) {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}/tasks`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setTasks(data);
          } else {
            console.error('Failed to fetch tasks from server');
          }
        } catch (error) {
          console.error('Error fetching tasks:', error);
        } finally {
          setLoading(false);
        }
      } else {
        // Guest mode fallback
        const saved = localStorage.getItem(storageKey);
        setTasks(
          saved
            ? JSON.parse(saved)
            : [
                { id: 1, text: 'Design the new onboarding flow', completed: true },
                { id: 2, text: 'Review pull requests', completed: false },
                { id: 3, text: 'Update dependencies', completed: false },
              ]
        );
      }
    };

    loadTasks();
  }, [token, storageKey]);

  // Sync to local storage only in guest mode
  useEffect(() => {
    if (!token) {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [tasks, token, storageKey]);

  // Click outside listener to dismiss visible delete buttons
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDeleteTaskId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.trim()) return;

    const taskText = newTask.trim();
    setNewTask('');

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ text: taskText })
        });
        if (res.ok) {
          const savedTask = await res.json();
          setTasks([savedTask, ...tasks]);
        }
      } catch (error) {
        console.error('Error adding task:', error);
      }
    } else {
      // Guest mode
      setTasks([
        {
          id: Date.now(),
          text: taskText,
          completed: false
        },
        ...tasks
      ]);
    }
  };

  const toggleTask = async (id: string | number, currentCompleted: boolean) => {
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ completed: !currentCompleted })
        });
        if (res.ok) {
          const updatedTask = await res.json();
          setTasks(tasks.map(t => ((t._id || t.id) === id ? updatedTask : t)));
        }
      } catch (error) {
        console.error('Error toggling task:', error);
      }
    } else {
      // Guest mode
      setTasks(tasks.map(t => ((t.id || t._id) === id ? { ...t, completed: !t.completed } : t)));
    }
  };

  const deleteTask = async (id: string | number) => {
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setTasks(tasks.filter(t => (t._id || t.id) !== id));
        }
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    } else {
      // Guest mode
      setTasks(tasks.filter(t => (t.id || t._id) !== id));
    }
  };

  // Long press event handlers
  const startPress = (e: React.MouseEvent | React.TouchEvent, id: string | number) => {
    e.stopPropagation(); // Avoid triggering global clicks
    cancelPress();
    pressTimer.current = setTimeout(() => {
      setActiveDeleteTaskId(id);
      // Trigger a light vibration if supported on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 350); // 350ms hold time
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full relative z-10 px-4 pb-28 pt-2">
      {/* HEADER BANNER */}
      <div
        className="w-full bg-[#FEF7D6] dark:from-[#2C2415] dark:to-[#42361C] rounded-[28px] p-6 mb-8 relative overflow-hidden shadow-sm shrink-0"
        style={{ height: '144px' }}
      >
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
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading tasks...</div>
        ) : (
          <AnimatePresence>
            {tasks.map(task => {
              const taskId = task._id || task.id;
              if (!taskId) return null;

              const isDeleteVisible = activeDeleteTaskId === taskId;

              return (
                <motion.div
                  key={taskId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-[#1A1C20] rounded-[20px] p-4 shadow-sm border border-black/5 dark:border-white/5 flex items-center justify-between group select-none touch-none"
                  onMouseDown={(e) => startPress(e, taskId)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={(e) => startPress(e, taskId)}
                  onTouchEnd={cancelPress}
                  onTouchMove={cancelPress}
                >
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(taskId, task.completed);
                    }}
                  >
                    <button
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0',
                        task.completed
                          ? 'bg-[#FFC107] text-white'
                          : 'border-2 border-gray-300 dark:border-gray-600 text-transparent hover:border-[#FFC107]'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(taskId, task.completed);
                      }}
                    >
                      <Check size={14} strokeWidth={4} />
                    </button>
                    <span
                      className={cn(
                        'text-sm font-medium transition-all',
                        task.completed
                          ? 'text-gray-400 dark:text-gray-500 line-through'
                          : 'text-gray-800 dark:text-gray-200'
                      )}
                    >
                      {task.text}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(taskId);
                    }}
                    className={cn(
                      'p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all shrink-0',
                      isDeleteVisible
                        ? 'opacity-100 scale-100'
                        : 'opacity-0 group-hover:opacity-100 pointer-events-auto sm:pointer-events-auto'
                    )}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!loading && tasks.length === 0 && (
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
