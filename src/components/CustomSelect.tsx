import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
  label?: string;
  value: string;
  options: (string | { value: string; label: string })[];
  onChange: (value: string) => void;
  icon?: React.ElementType;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, 
  value, 
  options, 
  onChange, 
  icon: Icon, 
  placeholder = 'Select...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => (typeof o === 'string' ? o === value : o.value === value));
  
  // Logic: If value is 'Any' or empty, use the placeholder (which is the title like 'Genre')
  const isPlaceholderActive = !value || value === 'Any';
  const displayValue = isPlaceholderActive 
    ? placeholder 
    : (typeof selectedOption === 'string' ? selectedOption : selectedOption?.label || value);

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-muted ml-3 opacity-50 flex items-center gap-2">
          {Icon && <Icon size={10} />} {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full h-10 bg-surface/50 border border-white/5 rounded-xl px-4 flex items-center justify-between hover:bg-white/5 transition-all text-[11px] font-bold outline-none ring-accent/0 focus:ring-accent/20 focus:border-accent/40 ${
            isOpen ? 'border-accent/40 bg-white/5' : ''
          } ${isPlaceholderActive ? 'text-text-muted/60' : 'text-white/90'}`}
        >
          <span className="truncate italic uppercase tracking-wider">{displayValue}</span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-accent' : 'opacity-30'}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-[100] left-0 right-0 mt-2 py-2 bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 rounded-xl backdrop-blur-2xl"
            >
              {options.map((opt) => {
                const val = typeof opt === 'string' ? opt : opt.value;
                const lbl = typeof opt === 'string' ? opt : opt.label;
                const isSelected = val === value;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      onChange(val);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-[10px] font-black text-left uppercase tracking-[0.15em] transition-all flex items-center justify-between group/opt ${
                      isSelected ? 'text-accent bg-accent/5' : 'text-text-muted/80 hover:bg-accent hover:text-background'
                    }`}
                  >
                    <span>{lbl}</span>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomSelect;
