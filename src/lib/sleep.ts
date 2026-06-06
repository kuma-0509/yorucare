import { COPY } from "./copy";

/** 寝た・起きた時刻（HH:mm）から睡眠分数を計算。日付またぎに対応 */
export function calculateSleepMinutes(
  sleepStart: string | null,
  sleepEnd: string | null
): number | null {
  if (!sleepStart || !sleepEnd) return null;

  const startParts = sleepStart.split(":").map(Number);
  const endParts = sleepEnd.split(":").map(Number);
  if (startParts.length < 2 || endParts.length < 2) return null;

  const [startH, startM] = startParts;
  const [endH, endM] = endParts;
  if (
    [startH, startM, endH, endM].some((n) => Number.isNaN(n)) ||
    startH < 0 ||
    startH > 23 ||
    endH < 0 ||
    endH > 23 ||
    startM < 0 ||
    startM > 59 ||
    endM < 0 ||
    endM > 59
  ) {
    return null;
  }

  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

export function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return COPY.sleepNotEntered;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
}
