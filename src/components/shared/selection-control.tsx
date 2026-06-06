"use client";

import { Check } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const selectionControlVariants = cva(
  `inline-flex items-center justify-center border-2 transition-colors ${FOCUS_RING}`,
  {
    variants: {
      layout: {
        row: "min-h-12 w-full rounded-xl px-4 py-3 text-base text-left",
        chip: "min-h-11 rounded-full px-4 py-2 text-sm",
        segment: "min-h-11 rounded-lg px-3 text-sm font-medium",
      },
      selected: {
        true: "border-primary bg-primary/10 text-foreground",
        false: "border-border bg-card hover:bg-muted text-foreground",
      },
    },
    defaultVariants: {
      layout: "row",
      selected: false,
    },
  }
);

type SelectionMode = "toggle" | "radio" | "checkbox";

interface SelectionControlProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof selectionControlVariants> {
  selected: boolean;
  mode?: SelectionMode;
  children: React.ReactNode;
}

export function SelectionControl({
  selected,
  mode = "toggle",
  layout,
  className,
  children,
  ...props
}: SelectionControlProps) {
  const ariaProps =
    mode === "radio"
      ? { role: "radio" as const, "aria-checked": selected }
      : { "aria-pressed": selected };

  return (
    <button
      type="button"
      className={cn(
        selectionControlVariants({ layout, selected }),
        layout === "row" && selected && "gap-2",
        className
      )}
      {...ariaProps}
      {...props}
    >
      {layout === "row" && selected && (
        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      )}
      <span className={layout === "row" ? "flex-1" : undefined}>{children}</span>
    </button>
  );
}

interface SelectionGroupProps {
  legend: string;
  mode: "radio" | "checkbox";
  className?: string;
  children: React.ReactNode;
}

export function SelectionGroup({
  legend,
  mode,
  className,
  children,
}: SelectionGroupProps) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="mb-2 block text-sm text-muted-foreground">
        {legend}
      </legend>
      <div
        role={mode === "radio" ? "radiogroup" : "group"}
        aria-label={legend}
        className="space-y-2"
      >
        {children}
      </div>
    </fieldset>
  );
}

/** @deprecated SelectionControl を直接使用してください */
export function OptionButton({
  selected,
  onClick,
  children,
  className,
  mode = "toggle",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  mode?: SelectionMode;
}) {
  return (
    <SelectionControl
      selected={selected}
      layout="row"
      mode={mode}
      onClick={onClick}
      className={className}
    >
      {children}
    </SelectionControl>
  );
}

/** @deprecated SelectionControl を直接使用してください */
export function ChipButton({
  selected,
  onClick,
  children,
  mode = "checkbox",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  mode?: SelectionMode;
}) {
  return (
    <SelectionControl
      selected={selected}
      layout="chip"
      mode={mode}
      onClick={onClick}
    >
      {children}
    </SelectionControl>
  );
}
