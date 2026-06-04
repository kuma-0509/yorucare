"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  variant?: "default" | "caution";
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  variant = "default",
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "rounded-2xl border-2",
        variant === "caution"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-card"
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 px-4 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-base font-semibold">{title}</p>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="space-y-4 border-t border-border px-4 pb-4 pt-2">{children}</div>}
    </section>
  );
}
