"use client";

import * as React from "react";
import { scrollIntoViewOnKeyboardFocus } from "@/lib/keyboard-scroll";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, onFocus, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[120px] w-full rounded-xl border-2 border-input bg-white px-4 py-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className
    )}
    ref={ref}
    onFocus={(event) => {
      scrollIntoViewOnKeyboardFocus(event.currentTarget);
      onFocus?.(event);
    }}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
