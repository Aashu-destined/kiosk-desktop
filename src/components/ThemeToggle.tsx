import React from 'react';
import { useTheme, ThemePreference } from '../contexts/ThemeContext';
import { Sun, Moon, Sparkles, Monitor, Gem } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { preference, setPreference, theme } = useTheme();

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'celestial', label: 'Celestial', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'obsidian', label: 'Flux', icon: <Gem className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setPreference(option.value)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
            ${preference === option.value 
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'}
          `}
          title={option.label}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;