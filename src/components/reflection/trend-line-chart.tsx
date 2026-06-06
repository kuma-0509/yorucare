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
import type { ChartPeriod } from "@/lib/dates";

interface TrendLineChartProps {
  points: TrendDataPoint[];
  metric: ChartMetricConfig;
  period: ChartPeriod;
}

function getTickInterval(period: ChartPeriod, pointCount: number): number {
  if (period === "week") return 0;
  if (period === "month") return Math.max(1, Math.floor(pointCount / 6));
  if (period === "6months") return Math.max(1, Math.floor(pointCount / 8));
  return Math.max(1, Math.floor(pointCount / 6));
}

export function TrendLineChart({
  points,
  metric,
  period,
}: TrendLineChartProps) {
  const domain = getYAxisDomain(metric, points);
  const tickInterval = getTickInterval(period, points.length);

  return (
    <div className="h-[220px] w-full sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
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
            minTickGap={16}
          />
          <YAxis
            domain={domain}
            allowDecimals={metric.id !== "selfCare"}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={32}
            tickCount={metric.domain ? 6 : 5}
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
              return item?.date ?? "";
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
