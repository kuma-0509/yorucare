"use client";

import { SelectionControl } from "@/components/shared/selection-control";
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
      role="group"
      aria-label="表示期間"
    >
      {PERIODS.map(({ id, label }) => (
        <SelectionControl
          key={id}
          selected={value === id}
          layout="segment"
          mode="radio"
          onClick={() => onChange(id)}
          className="w-full"
        >
          {label}
        </SelectionControl>
      ))}
    </div>
  );
}
