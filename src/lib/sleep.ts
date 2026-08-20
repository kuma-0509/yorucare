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

const MINUTES_PER_DAY = 24 * 60;

/** 候補ボタンの刻み（分）。よく使う時刻だけを並べ、ボタン数が増えすぎないようにする */
export const SLEEP_QUICK_STEP_MINUTES = 30;

/** 候補と候補の間を埋めるための微調整の刻み（分） */
export const SLEEP_ADJUST_STEP_MINUTES = 5;

/** HH:mm を 0時からの分に変換する。書式・範囲が不正なら null */
export function parseTimeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 0時からの分を HH:mm にする。24時間を超えた分は翌日の時刻として折り返す */
export function formatMinutesToTime(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * from から to まで step 刻みの HH:mm を並べる。
 * to が from より前なら日をまたぐ範囲として扱う（例: 21:00 → 02:00）。
 */
export function buildTimeOptions(
  from: string,
  to: string,
  step: number = SLEEP_QUICK_STEP_MINUTES
): string[] {
  const start = parseTimeToMinutes(from);
  const end = parseTimeToMinutes(to);
  if (start === null || end === null || step <= 0) return [];

  const span = end >= start ? end - start : end + MINUTES_PER_DAY - start;
  const options: string[] = [];
  for (let offset = 0; offset <= span; offset += step) {
    options.push(formatMinutesToTime(start + offset));
  }
  return options;
}

/** 「寝た時間」の候補。夜更かし側も選べるよう深夜まで含める */
export const SLEEP_START_QUICK_OPTIONS = buildTimeOptions("21:00", "02:00");

/** 「起きた時間」の候補 */
export const SLEEP_END_QUICK_OPTIONS = buildTimeOptions("05:00", "10:00");

/**
 * 時刻を delta 分ずらす。刻みの目盛りに合わせるため、
 * ずらした先は |delta| の倍数へ丸める（例: 22:03 の +5分 は 22:05）。
 * 未入力や不正な値なら null を返し、呼び出し側で操作させない。
 */
export function shiftTime(value: string | null, delta: number): string | null {
  const current = parseTimeToMinutes(value);
  if (current === null || delta === 0) return null;

  const step = Math.abs(delta);
  const shifted =
    delta > 0
      ? (Math.floor(current / step) + 1) * step
      : (Math.ceil(current / step) - 1) * step;
  return formatMinutesToTime(shifted);
}
