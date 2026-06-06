"use client";

import { SelectionControl } from "@/components/shared/selection-control";
import { CHART_METRICS, type ChartMetricId } from "@/lib/chart-data";

interface MetricTabsProps {
  value: ChartMetricId;
  onChange: (metric: ChartMetricId) => void;
}

export function MetricTabs({ value, onChange }: MetricTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="グラフの項目"
    >
      {CHART_METRICS.map(({ id, label }) => (
        <SelectionControl
          key={id}
          selected={value === id}
          layout="segment"
          mode="radio"
          onClick={() => onChange(id)}
          className="min-w-[4.5rem] rounded-full px-4"
        >
          {label}
        </SelectionControl>
      ))}
    </div>
  );
}
