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
