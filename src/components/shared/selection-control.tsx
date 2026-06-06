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
  /** 選択肢を識別するための装飾ドット（例: 気分カテゴリ色）。選択状態の表現には使わない */
  accentDotClass?: string;
  children: React.ReactNode;
}

export function SelectionControl({
  selected,
  mode = "toggle",
  layout = "row",
  accentDotClass,
  className,
  children,
  ...props
}: SelectionControlProps) {
  const ariaProps =
    mode === "radio"
      ? { role: "radio" as const, "aria-checked": selected }
      : { "aria-pressed": selected };

  const isRow = layout === "row";

  return (
    <button
      type="button"
      className={cn(
        selectionControlVariants({ layout, selected }),
        (selected || accentDotClass) && "gap-1.5",
        className
      )}
      {...ariaProps}
      {...props}
    >
      {accentDotClass && (
        <span
          className={cn("h-2.5 w-2.5 shrink-0 rounded-full", accentDotClass)}
          aria-hidden
        />
      )}
      {/* 色だけに頼らない選択シグナル（全レイアウト共通） */}
      {selected && (
        <Check
          className={cn(
            "shrink-0 text-primary",
            isRow ? "h-4 w-4" : "h-3.5 w-3.5"
          )}
          aria-hidden
        />
      )}
      <span className={isRow ? "flex-1" : undefined}>{children}</span>
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
