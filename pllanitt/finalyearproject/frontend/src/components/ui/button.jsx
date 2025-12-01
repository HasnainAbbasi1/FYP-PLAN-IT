
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default: "bg-primary text-white hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-white",
  secondary: "bg-secondary text-white hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-white",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-xs",
  lg: "h-11 px-8 text-sm",
  icon: "h-10 w-10 p-0",
};

const Button = React.forwardRef(({ 
  className = "",
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}, ref) => {
  if (asChild) {
    return <React.Fragment>{children}</React.Fragment>;
  }
  
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
        "ring-offset-background transition-colors duration-150 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:pointer-events-none",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants, buttonSizes };
