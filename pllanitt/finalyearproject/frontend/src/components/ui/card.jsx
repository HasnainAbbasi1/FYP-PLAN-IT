
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef(
  ({ className, ...props }, ref) => {
    // Check if dark mode is active by checking DOM
    const [isDark, setIsDark] = React.useState(() => {
      if (typeof window === 'undefined') return false;
      return document.documentElement.classList.contains('dark') ||
             document.body.classList.contains('dark');
    });
    
    // Watch for theme changes
    React.useEffect(() => {
      if (typeof window === 'undefined') return;
      
      const checkTheme = () => {
        const dark = document.documentElement.classList.contains('dark') ||
                    document.body.classList.contains('dark');
        setIsDark(dark);
      };
      
      // Check on mount
      checkTheme();
      
      // Watch for class changes
      const observer = new MutationObserver(checkTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      return () => observer.disconnect();
    }, []);
    
    return (
      <div
        ref={ref}
        data-card-component="true"
        className={cn(
          "rounded-[1.25rem] border border-accent-light-border dark:border-accent-dark-border",
          "text-slate-800 dark:text-slate-100",
          "!bg-white dark:!bg-slate-800",
          "shadow-card relative overflow-hidden transition-all duration-300 outline-none",
          "hover:-translate-y-1 hover:shadow-card-hover hover:border-accent-dark-border",
          "focus:outline-none focus-visible:outline-none active:outline-none",
          "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-base",
          className
        )}
        style={{
          backgroundColor: isDark ? 'rgb(30 41 59)' : '#ffffff',
          ...props.style
        }}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2 p-0 m-0 mb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100 m-0", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-[0.9375rem] text-slate-500 dark:text-slate-400 leading-relaxed m-0", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-0 m-0 text-slate-600 dark:text-slate-300", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-6 mt-6 border-t border-accent-light-border dark:border-accent-dark-border", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
