"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartMetricConfig, TrendDataPoint } from "@/lib/chart-data";
import { getYAxisDomain } from "@/lib/chart-data";
import {
  formatChartTooltipLabel,
  isMonthlyChartPeriod,
  type ChartPeriod,
} from "@/lib/dates";

interface TrendLineChartProps {
  points: TrendDataPoint[];
  metric: ChartMetricConfig;
  period: ChartPeriod;
}

function getTickInterval(period: ChartPeriod, pointCount: number): number {
  if (period === "week" || isMonthlyChartPeriod(period)) return 0;
  if (period === "month") return Math.max(1, Math.floor(pointCount / 5));
  return Math.max(1, Math.floor(pointCount / 5));
}

export function TrendLineChart({
  points,
  metric,
  period,
}: TrendLineChartProps) {
  const domain = getYAxisDomain(metric, points);
  const tickInterval = getTickInterval(period, points.length);
  const isCategoricalAxis = metric.axisTicks !== undefined;
  const yAxisWidth = isCategoricalAxis ? 72 : 32;

  return (
    <div className="h-[220px] w-full sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 8, left: isCategoricalAxis ? 0 : 4, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval={tickInterval}
            minTickGap={
              period === "week" ? 16 : isMonthlyChartPeriod(period) ? 8 : 24
            }
          />
          <YAxis
            domain={domain}
            allowDecimals={!isCategoricalAxis && metric.id !== "selfCare"}
            ticks={metric.axisTicks}
            tickFormatter={
              metric.formatAxisTick
                ? (value) => metric.formatAxisTick!(Number(value))
                : undefined
            }
            tick={{
              fontSize: isCategoricalAxis ? 11 : 12,
              fill: "#64748b",
            }}
            tickLine={false}
            axisLine={false}
            width={yAxisWidth}
            tickCount={isCategoricalAxis ? undefined : metric.domain ? 6 : 5}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              fontSize: "0.875rem",
            }}
            formatter={(value) => {
              if (value === null || value === undefined) return ["—", metric.label];
              return [metric.formatValue(Number(value)), metric.label];
            }}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as TrendDataPoint | undefined;
              if (!item?.date) return "";
              return formatChartTooltipLabel(item.date, period);
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#6b9fd4"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#6b9fd4", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#6b9fd4" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
