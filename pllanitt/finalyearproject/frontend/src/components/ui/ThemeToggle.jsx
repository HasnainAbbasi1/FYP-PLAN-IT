import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '@/lib/utils';

const ThemeToggle = ({ className = '', size = 'default', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    small: 'h-8 w-8 text-sm',
    default: 'h-10 w-10 text-base',
    large: 'h-12 w-12 text-lg'
  };

  const iconSize = {
    small: 16,
    default: 20,
    large: 24
  };

  return (
    <div className={cn("flex items-center justify-center gap-0 w-10 h-10 min-w-10 min-h-10 max-w-10 max-h-10 p-0 m-0 shrink-0", showLabel && "gap-2")}>
      <button
        onClick={toggleTheme}
        className={cn(
          "relative flex items-center justify-center rounded-lg border border-transparent transition-all duration-300 cursor-pointer overflow-hidden",
          "w-10 h-10 min-w-10 min-h-10 max-w-10 max-h-10 p-0 m-0 shrink-0",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
          "active:scale-95",
          "bg-accent-light border-accent-light-border text-slate-800",
          "hover:bg-accent-dark hover:border-accent-dark-border hover:text-accent hover:shadow-md",
          "dark:bg-accent-dark dark:border-accent-dark-border dark:text-slate-100",
          "dark:hover:bg-accent-dark dark:hover:border-accent-dark-border dark:hover:text-accent dark:hover:shadow-md",
          sizeClasses[size],
          className
        )}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <div className="relative">
          {/* Sun icon for dark mode (when light mode is inactive) */}
          <Sun
            size={iconSize[size]}
            className={cn(
              "absolute inset-0 transform transition-all duration-300 ease-in-out",
              isDark 
                ? 'rotate-90 scale-0 opacity-0' 
                : 'rotate-0 scale-100 opacity-100'
            )}
          />
          
          {/* Moon icon for light mode (when dark mode is inactive) */}
          <Moon
            size={iconSize[size]}
            className={cn(
              "absolute inset-0 transform transition-all duration-300 ease-in-out",
              isDark 
                ? 'rotate-0 scale-100 opacity-100' 
                : '-rotate-90 scale-0 opacity-0'
            )}
          />
        </div>
      </button>
      
      {showLabel && (
        <span className="text-sm font-medium text-foreground">
          {isDark ? 'Dark' : 'Light'} Mode
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
