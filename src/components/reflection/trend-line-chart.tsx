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
import type {
  ChartMetricConfig,
  ComparisonDataPoint,
  TrendDataPoint,
} from "@/lib/chart-data";
import { getYAxisDomain, toComparisonPoints } from "@/lib/chart-data";
import {
  formatChartTooltipLabel,
  isMonthlyChartPeriod,
  type ChartPeriod,
} from "@/lib/dates";

/** 主の線と、比べる線の色。太さと破線でも区別でき、色だけに頼らせない */
const PRIMARY_COLOR = "#6b9fd4";
const COMPARE_COLOR = "#c2793f";

interface TrendLineChartProps {
  points: (TrendDataPoint | ComparisonDataPoint)[];
  metric: ChartMetricConfig;
  period: ChartPeriod;
  /** 重ねて見る項目。未選択なら線を1本だけ描く */
  compareMetric?: ChartMetricConfig | null;
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
  compareMetric = null,
}: TrendLineChartProps) {
  const domain = getYAxisDomain(metric, points);
  const tickInterval = getTickInterval(period, points.length);
  const isCategoricalAxis = metric.axisTicks !== undefined;
  const yAxisWidth = isCategoricalAxis ? 72 : 32;

  const comparisonPoints = toComparisonPoints(
    points.map((point) => ({
      ...point,
      compareValue: "compareValue" in point ? point.compareValue : null,
    }))
  );
  const compareDomain = compareMetric
    ? getYAxisDomain(compareMetric, comparisonPoints)
    : undefined;
  const isCompareCategoricalAxis = compareMetric?.axisTicks !== undefined;

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
            yAxisId="primary"
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
          {compareMetric && (
            // 単位が違う2項目を同じ軸に載せないため、比べる項目は右側の軸で読む
            <YAxis
              yAxisId="compare"
              orientation="right"
              domain={compareDomain}
              allowDecimals={
                !isCompareCategoricalAxis && compareMetric.id !== "selfCare"
              }
              ticks={compareMetric.axisTicks}
              tickFormatter={
                compareMetric.formatAxisTick
                  ? (value) => compareMetric.formatAxisTick!(Number(value))
                  : undefined
              }
              tick={{
                fontSize: isCompareCategoricalAxis ? 11 : 12,
                fill: COMPARE_COLOR,
              }}
              tickLine={false}
              axisLine={false}
              width={isCompareCategoricalAxis ? 72 : 36}
              tickCount={
                isCompareCategoricalAxis
                  ? undefined
                  : compareMetric.domain
                    ? 6
                    : 5
              }
            />
          )}
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              fontSize: "0.875rem",
            }}
            formatter={(value, name) => {
              const isCompare = name === "compare";
              const config = isCompare && compareMetric ? compareMetric : metric;
              if (value === null || value === undefined) {
                return ["—", config.label];
              }
              return [config.formatValue(Number(value)), config.label];
            }}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as TrendDataPoint | undefined;
              if (!item?.date) return "";
              return formatChartTooltipLabel(item.date, period);
            }}
          />
          <Line
            yAxisId="primary"
            name="value"
            type="monotone"
            dataKey="value"
            stroke={PRIMARY_COLOR}
            strokeWidth={2.5}
            dot={{ r: 3, fill: PRIMARY_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: PRIMARY_COLOR }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {compareMetric && (
            <Line
              yAxisId="compare"
              name="compare"
              type="monotone"
              dataKey="compareValue"
              stroke={COMPARE_COLOR}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 2.5, fill: COMPARE_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: COMPARE_COLOR }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
