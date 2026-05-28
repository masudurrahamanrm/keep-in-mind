import React, { useState, useRef, useEffect } from 'react';

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  trigger: React.ReactNode;
}

export default function CustomDropdown({ value, onChange, options, trigger }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 min-w-[160px] bg-white dark:bg-[#222428] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => { onChange(option); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 
                  ${value === option 
                    ? 'text-[#FFC107] font-bold bg-[#FFC107]/5 dark:bg-[#FFC107]/10' 
                    : 'text-gray-700 dark:text-gray-300 font-medium'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
