import { STORAGE_KEYS } from "./constants";

/**
 * 記録後の締めくくり演出（本棚にしまう／紙にして手放す）の記録。
 *
 * 設計方針（B案）:
 * - 既存の DailyRecord スキーマには一切触れない。演出の選択は別キーで保持する。
 * - 「燃やす（手放す）」を実行しても、記録データそのものは削除しない。
 *   演出上「手放し済み」として burnedDates に日付を積むだけにする。
 * - 読み書きの失敗はコア機能に影響させない（握りつぶして安全側に倒す）。
 */
export type CompletionStyle = "shelf" | "paper";

export interface CompletionEntry {
  date: string;
  style: CompletionStyle;
  at: string;
}

export interface CompletionLog {
  entries: CompletionEntry[];
  /** 週次でまとめて手放した日付。記録自体は消さず、演出上の状態だけを表す */
  burnedDates: string[];
}

/** この枚数たまると「今週分を燃やす（手放す）」演出を出せる */
export const WEEKLY_BURN_THRESHOLD = 7;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emptyLog(): CompletionLog {
  return { entries: [], burnedDates: [] };
}

function readLog(): CompletionLog {
  if (!isBrowser()) return emptyLog();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.completionLog);
    if (!raw) return emptyLog();
    const parsed = JSON.parse(raw) as Partial<CompletionLog> | null;
    if (!parsed || typeof parsed !== "object") return emptyLog();
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.filter(isValidEntry)
      : [];
    const burnedDates = Array.isArray(parsed.burnedDates)
      ? parsed.burnedDates.filter((d): d is string => typeof d === "string")
      : [];
    return { entries, burnedDates };
  } catch {
    return emptyLog();
  }
}

function isValidEntry(value: unknown): value is CompletionEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.date === "string" &&
    (entry.style === "shelf" || entry.style === "paper") &&
    typeof entry.at === "string"
  );
}

function writeLog(log: CompletionLog): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.completionLog, JSON.stringify(log));
  } catch {
    /* 演出ログの保存失敗は記録のコア機能に影響させない */
  }
}

/**
 * その日の締めくくり演出を記録する。
 * 同じ日に選び直した場合は最新の選択で上書きする。
 */
export function recordCompletion(
  date: string,
  style: CompletionStyle
): CompletionLog {
  const log = readLog();
  const entries = log.entries.filter((e) => e.date !== date);
  entries.push({ date, style, at: new Date().toISOString() });
  const next: CompletionLog = { ...log, entries };
  writeLog(next);
  return next;
}

export function getCompletionForDate(date: string): CompletionEntry | null {
  return readLog().entries.find((e) => e.date === date) ?? null;
}

/** まだ手放していない「紙」の日付一覧（古い順） */
export function getActivePaperDates(): string[] {
  const log = readLog();
  const burned = new Set(log.burnedDates);
  return log.entries
    .filter((e) => e.style === "paper" && !burned.has(e.date))
    .map((e) => e.date)
    .sort();
}

/** まだ手放していない「紙」の枚数 */
export function getActivePaperCount(): number {
  return getActivePaperDates().length;
}

export function canBurnWeekly(): boolean {
  return getActivePaperCount() >= WEEKLY_BURN_THRESHOLD;
}

/**
 * たまった紙をまとめて手放す（演出上のみ）。
 * 記録データは削除せず、burnedDates に日付を積むだけ。
 */
export function burnActivePapers(): CompletionLog {
  const log = readLog();
  const active = getActivePaperDates();
  const burnedDates = Array.from(new Set([...log.burnedDates, ...active]));
  const next: CompletionLog = { ...log, burnedDates };
  writeLog(next);
  return next;
}

export function getCompletionLog(): CompletionLog {
  return readLog();
}
