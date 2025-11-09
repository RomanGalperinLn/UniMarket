import React, { createContext, useContext, useState, useEffect } from 'react';

const themes = {
  cyber: {
    name: 'Cyber Vault',
    colors: {
      background: '#0E0F14',
      surface: '#15151D',
      primary: '#00D1FF',
      secondary: '#3FFDCC',
      text: '#FFFFFF',
      textMuted: 'rgba(255, 255, 255, 0.6)',
      border: 'rgba(255, 255, 255, 0.1)',
    },
    effects: {
      glow: '0 0 20px rgba(0, 209, 255, 0.3), 0 0 40px rgba(63, 253, 204, 0.2)',
      textGlow: '0 0 10px rgba(0, 209, 255, 0.5), 0 0 20px rgba(0, 209, 255, 0.3)',
      borderRadius: '12px',
    }
  },
  elegant: {
    name: 'Elegant Classic',
    colors: {
      background: '#FAFAF9',
      surface: '#FFFFFF',
      primary: '#2D3648',
      secondary: '#B08968',
      text: '#1A1A1A',
      textMuted: 'rgba(26, 26, 26, 0.6)',
      border: 'rgba(0, 0, 0, 0.1)',
    },
    effects: {
      glow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      textGlow: 'none',
      borderRadius: '8px',
    }
  }
};

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('cyber');

  useEffect(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved && themes[saved]) {
      setCurrentTheme(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app-theme', currentTheme);
    const theme = themes[currentTheme];
    
    // Apply theme as CSS variables
    const root = document.documentElement;
    root.setAttribute('data-theme', currentTheme);
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    Object.entries(theme.effects).forEach(([key, value]) => {
      root.style.setProperty(`--effect-${key}`, value);
    });
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme(prev => prev === 'cyber' ? 'elegant' : 'cyber');
  };

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      theme: themes[currentTheme], 
      toggleTheme,
      themes 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}