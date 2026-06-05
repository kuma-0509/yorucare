/** YYYY-MM-DD（ローカルタイムゾーン） */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayString(): string {
  return toDateString(new Date());
}

export function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateString(d);
}

/** 直近7日（今日を含む、古い順） */
export function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateString(d));
  }
  return days;
}

/** 直近7日以内か（記録の入力・編集可能範囲） */
export function isWithinLast7Days(dateStr: string): boolean {
  return getLast7Days().includes(dateStr);
}

/** 日付切り替えボタン用の短いラベル */
export function formatDatePickerLabel(dateStr: string): string {
  if (dateStr === getTodayString()) return "今日";
  if (dateStr === getYesterdayString()) return "昨日";
  return formatShortDate(dateStr);
}

export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const base = `${m}月${d}日（${weekdays[date.getDay()]}）`;
  if (dateStr === today) return `今日 · ${base}`;
  if (dateStr === yesterday) return `昨日 · ${base}`;
  return base;
}

export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export type ChartPeriod = "week" | "month" | "6months" | "year";

const PERIOD_DAYS: Record<ChartPeriod, number> = {
  week: 7,
  month: 30,
  "6months": 180,
  year: 365,
};

/** 期間内の日付一覧（古い順・今日を含む） */
export function getDateRangeForPeriod(period: ChartPeriod): string[] {
  const days = PERIOD_DAYS[period];
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(toDateString(d));
  }
  return result;
}

export function formatChartAxisDate(
  dateStr: string,
  period: ChartPeriod
): string {
  const [, m, d] = dateStr.split("-");
  if (period === "year" || period === "6months") {
    return `${Number(m)}/${Number(d)}`;
  }
  return `${Number(d)}日`;
}
