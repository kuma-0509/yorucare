import { COPY } from "./copy";
import {
  formatChartAxisDate,
  formatChartMonthLabel,
  getDateRangeForPeriod,
  getMonthRangeForPeriod,
  isMonthlyChartPeriod,
  type ChartPeriod,
} from "./dates";
import { repository } from "./repository";
import type { DailyRecord, WarningLevel } from "./types";

export type ChartMetricId = "mood" | "sleep" | "warning" | "selfCare";

/** しんどさのサイン：Recharts 描画用の数値（なし=中央、あり=下） */
export const DISTRESS_SIGN_VALUE_MAP = {
  none: 0,
  small: -1,
  yes: -2,
  なし: 0,
  少しあり: -1,
  あり: -2,
} as const;

const DISTRESS_SIGN_LABEL_MAP: Record<number, string> = {
  0: "なし",
  [-1]: "少しあり",
  [-2]: "あり",
};

export function formatDistressSignAxisTick(value: number): string {
  if (value === 0) return "なし";
  if (value === -1) return "少しあり";
  if (value === -2) return "あり";
  return "";
}

export function formatDistressSignValue(value: number): string {
  if (Number.isInteger(value)) {
    return DISTRESS_SIGN_LABEL_MAP[value] ?? String(value);
  }
  return value.toFixed(1);
}

export interface ChartMetricConfig {
  id: ChartMetricId;
  label: string;
  description: string;
  yAxisLabel: string;
  /** 固定の縦軸範囲（未指定ならデータに合わせる） */
  domain?: [number, number];
  /** カテゴリ軸の固定目盛り（数値は内部表現、表示は formatAxisTick で変換） */
  axisTicks?: number[];
  formatAxisTick?: (value: number) => string;
  formatValue: (value: number) => string;
}

export interface TrendDataPoint {
  date: string;
  label: string;
  value: number | null;
}

export const CHART_METRICS: ChartMetricConfig[] = [
  {
    id: "mood",
    label: "総合気分",
    description: "5がいちばん良い状態です",
    yAxisLabel: "気分",
    domain: [1, 5],
    formatValue: (v) =>
      Number.isInteger(v) ? String(v) : v.toFixed(1),
  },
  {
    id: "sleep",
    label: "睡眠時間",
    description: "記録した睡眠時間（時間）",
    yAxisLabel: "時間",
    formatValue: (v) => `${v.toFixed(1)}h`,
  },
  {
    id: "warning",
    label: COPY.warningSign,
    description: COPY.chartWarningDescription,
    yAxisLabel: COPY.chartWarningAxis,
    domain: [-2, 2],
    axisTicks: [-2, -1, 0],
    formatAxisTick: formatDistressSignAxisTick,
    formatValue: formatDistressSignValue,
  },
  {
    id: "selfCare",
    label: COPY.selfCareAction,
    description: "その日にできた「できること」の数",
    yAxisLabel: "件数",
    formatValue: (v) =>
      Number.isInteger(v) ? `${v}件` : `${v.toFixed(1)}件`,
  },
];

function warningLevelToValue(level: WarningLevel | null): number | null {
  if (level === null) return null;
  return DISTRESS_SIGN_VALUE_MAP[level] ?? null;
}

function extractMetricValue(
  record: DailyRecord | undefined,
  metric: ChartMetricId
): number | null {
  if (!record) return null;

  switch (metric) {
    case "mood":
      return record.moodScore;
    case "sleep":
      return record.sleepMinutes !== null
        ? Math.round((record.sleepMinutes / 60) * 10) / 10
        : null;
    case "warning":
      return warningLevelToValue(record.warningLevel);
    case "selfCare":
      return record.selfCareIds.length;
    default:
      return null;
  }
}

function roundMonthlyAverage(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildDailyTrendSeries(
  period: ChartPeriod,
  metric: ChartMetricId
): TrendDataPoint[] {
  const dates = getDateRangeForPeriod(period);
  const recordsResult = repository.getAllRecords();
  const records = recordsResult.ok ? recordsResult.value : [];
  const recordsByDate = new Map(records.map((record) => [record.date, record]));

  return dates.map((date) => ({
    date,
    label: formatChartAxisDate(date, period),
    value: extractMetricValue(recordsByDate.get(date), metric),
  }));
}

function buildMonthlyTrendSeries(
  period: ChartPeriod,
  metric: ChartMetricId
): TrendDataPoint[] {
  const monthKeys = getMonthRangeForPeriod(period);
  const monthKeySet = new Set(monthKeys);
  const recordsResult = repository.getAllRecords();
  const records = recordsResult.ok ? recordsResult.value : [];

  const valuesByMonth = new Map<string, number[]>();

  for (const record of records) {
    const monthKey = record.date.slice(0, 7);
    if (!monthKeySet.has(monthKey)) continue;

    const value = extractMetricValue(record, metric);
    if (value === null) continue;

    const existing = valuesByMonth.get(monthKey) ?? [];
    existing.push(value);
    valuesByMonth.set(monthKey, existing);
  }

  return monthKeys.map((monthKey) => {
    const values = valuesByMonth.get(monthKey);
    const average =
      values && values.length > 0
        ? roundMonthlyAverage(
            values.reduce((sum, value) => sum + value, 0) / values.length
          )
        : null;

    return {
      date: monthKey,
      label: formatChartMonthLabel(monthKey),
      value: average,
    };
  });
}

export function buildTrendSeries(
  period: ChartPeriod,
  metric: ChartMetricId
): TrendDataPoint[] {
  if (isMonthlyChartPeriod(period)) {
    return buildMonthlyTrendSeries(period, metric);
  }
  return buildDailyTrendSeries(period, metric);
}

export function countRecordedPoints(points: TrendDataPoint[]): number {
  return points.filter((p) => p.value !== null).length;
}

export function getYAxisDomain(
  metric: ChartMetricConfig,
  points: TrendDataPoint[]
): [number, number] {
  if (metric.domain) return metric.domain;

  const values = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null);

  if (values.length === 0) return [0, 1];

  const max = Math.max(...values);
  const padded = Math.max(max + 1, 1);
  return [0, padded];
}
