import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
  onItemsPerPageChange
}) => {
  const pages = [];
  const maxVisiblePages = 5;
  
  // Calculate page range
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (page !== currentPage) {
      onPageChange(page);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-4 sm:gap-3 py-5 items-center">
      <div className="flex items-center gap-4 sm:flex-col sm:gap-2 sm:text-center text-sm text-slate-500 dark:text-slate-400">
        <span>
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
        </span>
        {onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm cursor-pointer text-slate-800 dark:text-slate-100"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="min-w-[100px] sm:min-w-[80px] sm:text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1 sm:gap-0.5">
          {startPage > 1 && (
            <>
              <button
                className="min-w-[36px] sm:min-w-[32px] h-9 sm:h-8 px-3 sm:px-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm sm:text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                onClick={() => handlePageClick(1)}
              >
                1
              </button>
              {startPage > 2 && <span className="px-2 text-slate-500 dark:text-slate-400">...</span>}
            </>
          )}
          
          {pages.map(page => (
            <button
              key={page}
              className={`min-w-[36px] sm:min-w-[32px] h-9 sm:h-8 px-3 sm:px-2 border rounded-md text-sm sm:text-xs font-medium cursor-pointer transition-all duration-200 ${
                page === currentPage
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
              onClick={() => handlePageClick(page)}
            >
              {page}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2 text-slate-500 dark:text-slate-400">...</span>}
              <button
                className="min-w-[36px] sm:min-w-[32px] h-9 sm:h-8 px-3 sm:px-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm sm:text-xs font-medium cursor-pointer transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                onClick={() => handlePageClick(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="min-w-[100px] sm:min-w-[80px] sm:text-xs"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;

