import React from 'react';

/**
 * Reusable loading skeleton component
 */
export const LoadingSkeleton = ({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  count = 1 
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] animate-[loading_1.5s_ease-in-out_infinite] rounded ${
        variant === 'text' ? 'h-4 mb-2' : ''
      } ${
        variant === 'rect' ? 'rounded-lg' : ''
      } ${
        variant === 'circle' ? 'rounded-full' : ''
      } ${className}`}
      style={{ width, height }}
    />
  ));

  return <>{skeletons}</>;
};

/**
 * Card skeleton for project cards
 */
export const CardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 py-6">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm">
        <LoadingSkeleton variant="rect" height="200px" />
        <div className="p-4 flex flex-col gap-2">
          <LoadingSkeleton variant="text" width="80%" height="24px" />
          <LoadingSkeleton variant="text" width="60%" height="16px" />
          <LoadingSkeleton variant="text" width="40%" height="16px" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Table skeleton
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="w-full">
    <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 p-3 bg-slate-100 dark:bg-slate-700 rounded mb-2">
      {Array.from({ length: cols }, (_, i) => (
        <LoadingSkeleton key={i} variant="text" width="100%" height="20px" />
      ))}
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 p-3 border-b border-slate-200 dark:border-slate-700">
        {Array.from({ length: cols }, (_, j) => (
          <LoadingSkeleton key={j} variant="text" width="100%" height="16px" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Page skeleton
 */
export const PageSkeleton = () => (
  <div className="p-6">
    <LoadingSkeleton variant="text" width="300px" height="32px" className="mb-4" />
    <LoadingSkeleton variant="text" width="200px" height="16px" className="mb-8" />
    <CardSkeleton count={3} />
  </div>
);

export default LoadingSkeleton;

