import { STORAGE_KEYS } from "./constants";
import { repository } from "./repository";
import { ok, type Result } from "./result";

/** 初回バックアップを促すまでの猶予（記録開始からの日数） */
export const FIRST_BACKUP_GRACE_DAYS = 3;
/** 前回バックアップからの再通知しきい値（日数） */
export const BACKUP_REMINDER_INTERVAL_DAYS = 7;
/** 「あとで」を選んだあとに再表示するまでの間隔（日数） */
export const BACKUP_SNOOZE_DAYS = 1;

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

export function getBackupSnoozedUntil(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.backupReminderSnoozedUntil);
  } catch {
    return null;
  }
}

export function isBackupReminderSnoozed(
  snoozedUntil: string | null,
  now: Date
): boolean {
  if (!snoozedUntil) return false;
  const until = new Date(snoozedUntil);
  if (Number.isNaN(until.getTime())) return false;
  return now.getTime() < until.getTime();
}

/** 「あとで」を選んだときに、次の再表示期限を残す */
export function snoozeBackupReminder(now: Date = new Date()): void {
  if (!isBrowser()) return;
  try {
    const until = new Date(
      now.getTime() + BACKUP_SNOOZE_DAYS * MS_PER_DAY
    );
    localStorage.setItem(
      STORAGE_KEYS.backupReminderSnoozedUntil,
      until.toISOString()
    );
  } catch {
    /* 期限の保存に失敗しても本処理は継続する */
  }
}

export function clearBackupReminderSnooze(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.backupReminderSnoozedUntil);
  } catch {
    /* 期限の削除に失敗しても本処理は継続する */
  }
}

/** ファイル保存が成功したときに記録する。失敗した経路からは呼ばない */
export function recordBackupDone(now: Date = new Date()): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.lastBackupAt, now.toISOString());
    clearBackupReminderSnooze();
  } catch {
    /* バックアップ時刻の保存に失敗しても本処理は継続する */
  }
}

/** 実データを読み取って通知要否を返す */
export async function getBackupReminder(
  now: Date = new Date()
): Promise<Result<BackupReminderState>> {
  const recordsResult = await repository.getAllRecords();
  if (!recordsResult.ok) return recordsResult;
  const records = recordsResult.value;

  const oldestRecordAt =
    records.length > 0
      ? records.reduce(
          (oldest, r) => (r.createdAt < oldest ? r.createdAt : oldest),
          records[0].createdAt
        )
      : null;

  return ok(
    evaluateBackupReminder({
      recordCount: records.length,
      oldestRecordAt,
      lastBackupAt: getLastBackupAt(),
      now,
    })
  );
}
