"use client";

import { cn } from "@/lib/utils";

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function OptionButton({
  selected,
  onClick,
  children,
  className,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-12 w-full rounded-xl border-2 px-4 py-3 text-left text-base transition-colors",
        selected
          ? "border-primary bg-blue-50 text-foreground"
          : "border-border bg-white hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  );
}

interface ChipButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function ChipButton({ selected, onClick, children }: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 px-4 py-2 text-sm transition-colors min-h-10",
        selected
          ? "border-primary bg-blue-50"
          : "border-border bg-white hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}
