import { STORAGE_KEYS } from "./constants";

/**
 * 記録後の締めくくり演出（書庫にしまう／紙にして手放す／まとめて手放す）で
 * 端末に残していた選択の記録。
 *
 * 演出そのものは実機テストの結果を受けて 2026-08-21 に削除したため、
 * 新しく書き込むことはない。ただし、すでに使っていた端末には
 * `yorucare_completion_log` が残っており、そこには「どの日に記録したか」が
 * 日付の一覧として入っている。記録を消したときに演出の記録だけが残らないよう、
 * 消すための入口だけを残す。
 *
 * - 読み書きの失敗はコア機能に影響させない（握りつぶして安全側に倒す）。
 */
interface StoredCompletionLog {
  entries: { date: string }[];
  burnedDates: string[];
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * 端末に残っている演出の記録を読む。
 * 形の合わない項目は落とし、日付だけを見る（用途は削除に限る）。
 */
function readLog(): StoredCompletionLog {
  const empty: StoredCompletionLog = { entries: [], burnedDates: [] };
  if (!isBrowser()) return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.completionLog);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<StoredCompletionLog> | null;
    if (!parsed || typeof parsed !== "object") return empty;
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.filter(
          (entry): entry is { date: string } =>
            !!entry &&
            typeof entry === "object" &&
            typeof (entry as { date?: unknown }).date === "string"
        )
      : [];
    const burnedDates = Array.isArray(parsed.burnedDates)
      ? parsed.burnedDates.filter((d): d is string => typeof d === "string")
      : [];
    return { entries, burnedDates };
  } catch {
    return empty;
  }
}

/** 指定した日の演出の記録だけを端末から消す。 */
export function clearCompletionForDate(date: string): void {
  if (!isBrowser()) return;

  try {
    const log = readLog();
    const next: StoredCompletionLog = {
      entries: log.entries.filter((entry) => entry.date !== date),
      burnedDates: log.burnedDates.filter((burnedDate) => burnedDate !== date),
    };

    if (next.entries.length === 0 && next.burnedDates.length === 0) {
      localStorage.removeItem(STORAGE_KEYS.completionLog);
      return;
    }
    localStorage.setItem(STORAGE_KEYS.completionLog, JSON.stringify(next));
  } catch {
    /* 演出ログの削除失敗は記録のコア機能に影響させない */
  }
}

/**
 * 演出の記録を端末から消す。
 *
 * 「すべての記録を削除」は共有端末で使い終わったときのための機能なので、
 * 記録本体だけを消すと、どの日に記録したかが演出のログとして端末に残る。
 * 記録を消すときはこちらも一緒に消す。
 */
export function clearCompletionLog(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEYS.completionLog);
}
