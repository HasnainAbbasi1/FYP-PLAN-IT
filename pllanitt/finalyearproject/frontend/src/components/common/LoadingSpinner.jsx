import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', text = 'Loading...', fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[9999] animate-fade-in">
        <div className="flex flex-col items-center gap-4 p-8 bg-slate-900/95 dark:bg-slate-800/95 rounded-2xl border border-blue-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <Loader2 className={`${sizeClasses[size]} animate-spin text-accent`} />
          {text && <p className="text-slate-400 text-sm font-medium m-0">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-accent`} />
      {text && <p className="text-slate-400 text-sm font-medium m-0">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
