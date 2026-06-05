"use client";

import { Button } from "@/components/ui/button";
import { CHART_METRICS, type ChartMetricId } from "@/lib/chart-data";
import { cn } from "@/lib/utils";

interface MetricTabsProps {
  value: ChartMetricId;
  onChange: (metric: ChartMetricId) => void;
}

export function MetricTabs({ value, onChange }: MetricTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="グラフの項目"
    >
      {CHART_METRICS.map(({ id, label }) => {
        const active = value === id;
        return (
          <Button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 rounded-full px-3 text-sm",
              !active && "bg-card"
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
