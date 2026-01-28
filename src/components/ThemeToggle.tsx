import React from 'react';
import { useTheme, ThemePreference } from '../contexts/ThemeContext';
import { Sun, Moon, Sparkles, Monitor, Gem, Droplets } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { preference, setPreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'celestial', label: 'Celestial', icon: <Sparkles className="w-4 h-4" /> },
    { value: 'obsidian', label: 'Flux', icon: <Gem className="w-4 h-4" /> },
    { value: 'glass', label: 'Glass', icon: <Droplets className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="flex bg-app p-1 rounded-lg border border-border">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setPreference(option.value)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200
            ${preference === option.value
              ? 'bg-panel text-primary shadow-sm border border-border'
              : 'text-muted hover:text-primary hover:bg-app/50'}
          `}
          title={option.label}
          aria-label={`Switch to ${option.label} theme`}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;