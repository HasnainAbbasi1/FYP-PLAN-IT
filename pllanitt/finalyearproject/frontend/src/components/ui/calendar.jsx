import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

/**
 * Simple Calendar component
 * A basic calendar picker for date selection
 */
export const Calendar = ({ mode = 'single', selected, onSelect, ...props }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handleDateClick = (day) => {
    const date = new Date(year, month, day);
    if (onSelect) {
      onSelect(date);
    }
  };
  
  const isSelected = (day) => {
    if (!selected) return false;
    const date = new Date(year, month, day);
    const selectedDate = new Date(selected);
    return date.toDateString() === selectedDate.toDateString();
  };
  
  const isToday = (day) => {
    const today = new Date();
    const date = new Date(year, month, day);
    return date.toDateString() === today.toDateString();
  };
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  return (
    <div className="w-full max-w-[320px] p-4 bg-background rounded-lg shadow-md" {...props}>
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-base text-foreground">
          {monthNames[month]} {year}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          return (
            <button
              key={day}
              className={cn(
                "aspect-square flex items-center justify-center border-none bg-transparent cursor-pointer rounded text-sm text-foreground transition-all duration-200",
                isToday(day) && "bg-accent-light text-accent font-semibold",
                isSelected(day) && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90",
                !isSelected(day) && !isToday(day) && "hover:bg-muted"
              )}
              onClick={() => handleDateClick(day)}
              aria-label={`Select ${monthNames[month]} ${day}, ${year}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
