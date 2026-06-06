"use client";

import * as React from "react";
import { scrollIntoViewOnKeyboardFocus } from "@/lib/keyboard-scroll";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border-2 border-input bg-white px-4 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      ref={ref}
      onFocus={(event) => {
        scrollIntoViewOnKeyboardFocus(event.currentTarget);
        onFocus?.(event);
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
