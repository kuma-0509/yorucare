"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChartPeriod } from "@/lib/dates";

const PERIODS: { id: ChartPeriod; label: string }[] = [
  { id: "week", label: "週" },
  { id: "month", label: "月" },
  { id: "6months", label: "6ヶ月" },
  { id: "year", label: "年" },
];

interface PeriodTabsProps {
  value: ChartPeriod;
  onChange: (period: ChartPeriod) => void;
}

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <div
      className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1"
      role="tablist"
      aria-label="表示期間"
    >
      {PERIODS.map(({ id, label }) => {
        const active = value === id;
        return (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            variant={active ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-9 rounded-lg px-2 text-sm font-medium",
              !active && "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(id)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
