import { formatChartAxisDate, getDateRangeForPeriod, type ChartPeriod } from "./dates";
import { getAllRecords } from "./storage";
import type { DailyRecord, WarningLevel } from "./types";

export type ChartMetricId = "mood" | "sleep" | "warning" | "selfCare";

export interface ChartMetricConfig {
  id: ChartMetricId;
  label: string;
  description: string;
  yAxisLabel: string;
  /** 固定の縦軸範囲（未指定ならデータに合わせる） */
  domain?: [number, number];
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
    formatValue: (v) => String(v),
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
    label: "危険サイン",
    description: "0=なし、1=少しあり、2=あり",
    yAxisLabel: "強さ",
    domain: [0, 2],
    formatValue: (v) => {
      if (v === 0) return "なし";
      if (v === 1) return "少しあり";
      return "あり";
    },
  },
  {
    id: "selfCare",
    label: "セルフケア",
    description: "その日にできたセルフケアの数",
    yAxisLabel: "件数",
    formatValue: (v) => `${Math.round(v)}件`,
  },
];

function warningLevelToValue(level: WarningLevel | null): number | null {
  if (level === null) return null;
  if (level === "none") return 0;
  if (level === "small") return 1;
  return 2;
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

export function buildTrendSeries(
  period: ChartPeriod,
  metric: ChartMetricId
): TrendDataPoint[] {
  const dates = getDateRangeForPeriod(period);
  const recordsByDate = new Map(
    getAllRecords().map((record) => [record.date, record])
  );

  return dates.map((date) => ({
    date,
    label: formatChartAxisDate(date, period),
    value: extractMetricValue(recordsByDate.get(date), metric),
  }));
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
