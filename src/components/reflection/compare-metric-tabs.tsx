"use client";

import { SelectionControl } from "@/components/shared/selection-control";
import { COPY } from "@/lib/copy";
import { CHART_METRICS, type ChartMetricId } from "@/lib/chart-data";

interface CompareMetricTabsProps {
  /** 主の項目。同じ線を二重に描かないよう、選択肢から外す */
  primary: ChartMetricId;
  value: ChartMetricId | null;
  onChange: (metric: ChartMetricId | null) => void;
}

export function CompareMetricTabs({
  primary,
  value,
  onChange,
}: CompareMetricTabsProps) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm text-muted-foreground">
        {COPY.chartCompare.heading}
      </legend>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={COPY.chartCompare.heading}
      >
        <SelectionControl
          selected={value === null}
          layout="segment"
          mode="radio"
          onClick={() => onChange(null)}
          className="rounded-full px-4"
        >
          {COPY.chartCompare.none}
        </SelectionControl>
        {CHART_METRICS.filter(({ id }) => id !== primary).map(
          ({ id, label }) => (
            <SelectionControl
              key={id}
              selected={value === id}
              layout="segment"
              mode="radio"
              onClick={() => onChange(value === id ? null : id)}
              className="rounded-full px-4"
            >
              {label}
            </SelectionControl>
          )
        )}
      </div>
    </fieldset>
  );
}
