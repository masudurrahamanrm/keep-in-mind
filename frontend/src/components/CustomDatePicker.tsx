import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, setHours, setMinutes, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

export default function CustomDatePicker({ value, onChange, onClose }: CustomDatePickerProps) {
  const initialDate = value ? parseISO(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  
  const [hour, setHour] = useState(format(initialDate, 'hh'));
  const [minute, setMinute] = useState(format(initialDate, 'mm'));
  const [ampm, setAmpm] = useState(format(initialDate, 'a'));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const renderCells = () => {
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <div
            key={day.toISOString()}
            className={`flex items-center justify-center h-10 w-10 text-sm cursor-pointer rounded-full transition-colors
              ${!isCurrentMonth ? "text-gray-300 dark:text-gray-600" : ""}
              ${isSelected ? "bg-[#FFC107] text-white font-bold" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
            onClick={() => setSelectedDate(cloneDay)}
          >
            {formattedDate}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="flex justify-between w-full" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  const handleSave = () => {
    let finalDate = new Date(selectedDate);
    let h = parseInt(hour);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    
    finalDate = setHours(finalDate, h);
    finalDate = setMinutes(finalDate, parseInt(minute));
    
    onChange(finalDate.toISOString());
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1A1C20] rounded-[20px] shadow-xl border border-black/5 dark:border-white/5 w-full max-w-[320px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Select Date & Time</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Calendar Body */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex justify-between w-full mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="h-8 w-8 flex items-center justify-center text-[11px] font-semibold text-gray-400">
                {d}
              </div>
            ))}
          </div>

          <div className="space-y-0.5">
            {renderCells()}
          </div>
        </div>

        {/* Time Selection */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Time</label>
          <div className="flex items-center gap-2">
            <select 
              value={hour} 
              onChange={e => setHour(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-center font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#FFC107] appearance-none cursor-pointer text-sm"
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i} value={(i + 1).toString().padStart(2, '0')}>{(i + 1).toString().padStart(2, '0')}</option>
              ))}
            </select>
            <span className="font-bold text-gray-400 text-sm">:</span>
            <select 
              value={minute} 
              onChange={e => setMinute(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-center font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#FFC107] appearance-none cursor-pointer text-sm"
            >
              {['00', '15', '30', '45'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5 ml-1">
              <button 
                onClick={() => setAmpm('AM')}
                className={`px-2 py-1 rounded text-[12px] font-bold transition-colors ${ampm === 'AM' ? 'bg-[#FFC107] text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                AM
              </button>
              <button 
                onClick={() => setAmpm('PM')}
                className={`px-2 py-1 rounded text-[12px] font-bold transition-colors ${ampm === 'PM' ? 'bg-[#FFC107] text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 flex gap-2">
          <button 
            onClick={onClose}
            className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-2 bg-[#FFC107] hover:bg-[#F5B000] text-white font-bold rounded-xl transition-colors text-sm"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
