import { STORAGE_KEYS } from "./constants";
import { repository } from "./repository";

/** 初回バックアップを促すまでの猶予（記録開始からの日数） */
export const FIRST_BACKUP_GRACE_DAYS = 3;
/** 前回バックアップからの再通知しきい値（日数） */
export const BACKUP_REMINDER_INTERVAL_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface BackupReminderInput {
  recordCount: number;
  /** 最も古い記録の作成時刻（ISO文字列）。記録がなければ null */
  oldestRecordAt: string | null;
  /** 前回ファイル保存の時刻（ISO文字列）。未保存なら null */
  lastBackupAt: string | null;
  now: Date;
}

export interface BackupReminderState {
  shouldRemind: boolean;
  /** 前回保存からの経過日数。未保存なら null */
  daysSinceBackup: number | null;
  recordCount: number;
}

function diffInDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** 能動的にバックアップを促すかどうかの純粋判定（テスト対象） */
export function evaluateBackupReminder(
  input: BackupReminderInput
): BackupReminderState {
  const { recordCount, oldestRecordAt, lastBackupAt, now } = input;

  if (recordCount === 0) {
    return { shouldRemind: false, daysSinceBackup: null, recordCount };
  }

  if (!lastBackupAt) {
    // 一度も保存していない。記録開始から猶予を過ぎたら促す。
    const since = oldestRecordAt
      ? diffInDays(new Date(oldestRecordAt), now)
      : 0;
    return {
      shouldRemind: since >= FIRST_BACKUP_GRACE_DAYS,
      daysSinceBackup: null,
      recordCount,
    };
  }

  const daysSinceBackup = diffInDays(new Date(lastBackupAt), now);
  return {
    shouldRemind: daysSinceBackup >= BACKUP_REMINDER_INTERVAL_DAYS,
    daysSinceBackup,
    recordCount,
  };
}

export function getLastBackupAt(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.lastBackupAt);
  } catch {
    return null;
  }
}

/** ファイル保存が成功したときに記録する */
export function recordBackupDone(now: Date = new Date()): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.lastBackupAt, now.toISOString());
  } catch {
    /* バックアップ時刻の保存に失敗しても本処理は継続する */
  }
}

/** 実データを読み取って通知要否を返す */
export function getBackupReminder(now: Date = new Date()): BackupReminderState {
  const recordsResult = repository.getAllRecords();
  const records = recordsResult.ok ? recordsResult.value : [];

  const oldestRecordAt =
    records.length > 0
      ? records.reduce(
          (oldest, r) => (r.createdAt < oldest ? r.createdAt : oldest),
          records[0].createdAt
        )
      : null;

  return evaluateBackupReminder({
    recordCount: records.length,
    oldestRecordAt,
    lastBackupAt: getLastBackupAt(),
    now,
  });
}
