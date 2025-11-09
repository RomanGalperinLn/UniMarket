import React from 'react';
import { Button } from '@/components/ui/button';
import { Zap, BookOpen } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { currentTheme, toggleTheme, theme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="sm"
      className="w-full flex items-center justify-between gap-2 transition-all duration-300"
      style={{
        background: currentTheme === 'cyber' 
          ? 'rgba(0, 209, 255, 0.1)' 
          : 'rgba(176, 137, 104, 0.1)',
        borderColor: currentTheme === 'cyber'
          ? 'rgba(0, 209, 255, 0.3)'
          : 'rgba(176, 137, 104, 0.3)',
        color: currentTheme === 'cyber' ? '#00D1FF' : '#B08968'
      }}
    >
      {currentTheme === 'cyber' ? (
        <>
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">Cyber Vault</span>
        </>
      ) : (
        <>
          <BookOpen className="w-4 h-4" />
          <span className="text-sm font-medium">Elegant</span>
        </>
      )}
    </Button>
  );
}