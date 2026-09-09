import { STORAGE_KEYS } from "./constants";

/**
 * 記録がない日の寝た時間・起きた時間の初期値。
 * 端末内だけに残し、記録本体・バックアップ・送信対象には含めない。
 */
export type LastSleepTimes = {
  sleepStart: string | null;
  sleepEnd: string | null;
};

const EMPTY_LAST_SLEEP_TIMES: LastSleepTimes = {
  sleepStart: null,
  sleepEnd: null,
};

/** 記録の時刻と同じ HH:mm（24時間）だけを初期値として使う */
const CLOCK_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parseClockTime(value: unknown): string | null {
  return typeof value === "string" && CLOCK_TIME_PATTERN.test(value)
    ? value
    : null;
}

function toLastSleepTimes(value: unknown): LastSleepTimes {
  if (typeof value !== "object" || value === null) {
    return { ...EMPTY_LAST_SLEEP_TIMES };
  }
  const source = value as Record<string, unknown>;
  return {
    sleepStart: parseClockTime(source.sleepStart),
    sleepEnd: parseClockTime(source.sleepEnd),
  };
}

/** 保存されている直近の時刻。無い・壊れているときは空欄 */
export function getLastSleepTimes(): LastSleepTimes {
  if (!isBrowser()) return { ...EMPTY_LAST_SLEEP_TIMES };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lastSleepTimes);
    if (!raw) return { ...EMPTY_LAST_SLEEP_TIMES };
    return toLastSleepTimes(JSON.parse(raw));
  } catch {
    return { ...EMPTY_LAST_SLEEP_TIMES };
  }
}

/**
 * 保存した時刻を次の新規入力の初期値として残す。
 * 両方空欄の保存では、以前の初期値を消さない。
 */
export function rememberLastSleepTimes(
  sleepStart: string | null,
  sleepEnd: string | null
): void {
  if (!isBrowser()) return;
  const next: LastSleepTimes = {
    sleepStart: parseClockTime(sleepStart),
    sleepEnd: parseClockTime(sleepEnd),
  };
  if (next.sleepStart === null && next.sleepEnd === null) return;
  try {
    localStorage.setItem(STORAGE_KEYS.lastSleepTimes, JSON.stringify(next));
  } catch {
    // 初期値を残せなくても、記録本体の保存は続ける
  }
}

/** 記録がまだない日のフォームへ、直近の時刻を初期値として入れる */
export function mergeLastSleepTimes<
  T extends { sleepStart: string | null; sleepEnd: string | null },
>(form: T): T {
  const last = getLastSleepTimes();
  return {
    ...form,
    sleepStart: last.sleepStart,
    sleepEnd: last.sleepEnd,
  };
}
