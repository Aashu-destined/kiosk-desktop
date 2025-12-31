import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'celestial' | 'obsidian';
export type ThemePreference = ThemeMode | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem('kiosk-ui-theme');
    return (stored as ThemePreference) || 'system';
  });

  const [theme, setTheme] = useState<ThemeMode>('celestial'); // Default initial state

  useEffect(() => {
    localStorage.setItem('kiosk-ui-theme', preference);
    updateTheme(preference);
  }, [preference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (preference === 'system') {
        updateTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preference]);

  const updateTheme = (pref: ThemePreference) => {
    let newTheme: ThemeMode;

    if (pref === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Default to Dark/Celestial for system dark mode, Light for light mode
      newTheme = isDark ? 'dark' : 'light'; 
    } else {
      newTheme = pref;
    }

    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}