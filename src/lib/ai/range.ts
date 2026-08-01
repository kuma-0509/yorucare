import type { DailyRecord } from "../types";

/**
 * 期間集計で共通に使う日付ユーティリティ。
 *
 * 日付は YYYY-MM-DD 固定なので、辞書順と時系列順が一致する。
 * 比較にタイムゾーンを持ち込むと端末の設定で結果が変わるため、文字列比較で扱う。
 */

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 列挙できる期間の上限。
 * 想定は最長でも数年分であり、これを超える指定は誤りとして扱う。
 */
export const MAX_RANGE_DAYS = 3700;

export function isDateInRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/** from と to を含む暦日数。範囲が不正なら 0 */
export function countDaysInRange(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / MILLISECONDS_PER_DAY) + 1;
}

/**
 * from から to までの日付を1日ずつ並べる。
 * 記録がない日も含めるため、連続日数の判定では未記録日を飛ばさずに扱える。
 */
export function enumerateDates(from: string, to: string): string[] {
  const days = countDaysInRange(from, to);
  if (days === 0 || days > MAX_RANGE_DAYS) return [];

  const start = Date.parse(`${from}T00:00:00Z`);
  const dates: string[] = [];
  for (let i = 0; i < days; i += 1) {
    dates.push(new Date(start + i * MILLISECONDS_PER_DAY).toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * 期間内の記録を日付で引けるようにする。
 * 記録は日付ごとに1件である前提だが、重複があっても日付単位で1件に畳む。
 */
export function indexRecordsByDate(
  records: DailyRecord[],
  from: string,
  to: string
): Map<string, DailyRecord> {
  const byDate = new Map<string, DailyRecord>();
  for (const record of records) {
    if (!isDateInRange(record.date, from, to)) continue;
    byDate.set(record.date, record);
  }
  return byDate;
}
