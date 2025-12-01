
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator = React.forwardRef((props, ref) => {
  const { className, orientation = "horizontal", decorative = true, ...otherProps } = props;
  
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...otherProps}
    />
  );
});

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
