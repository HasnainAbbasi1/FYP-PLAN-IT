
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-primary text-primary-foreground hover:opacity-80",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-80",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-80",
  outline: "text-foreground border-current",
};

function Badge({ className, variant = "default", ...props }) {
  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2.5 h-5 text-xs font-semibold",
        "transition-colors duration-150 ease-in-out",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        badgeVariants[variant],
        className
      )} 
      {...props} 
    />
  );
}

export { Badge };
