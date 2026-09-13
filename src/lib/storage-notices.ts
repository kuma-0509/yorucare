import {
  evaluateBackupReminder,
  getBackupSnoozedUntil,
  getLastBackupAt,
  isBackupReminderSnoozed,
  type BackupReminderState,
} from "./backup-reminder";
import { STORAGE_KEYS } from "./constants";
import { repository } from "./repository";
import { ok, type Result } from "./result";

export type VisibleStorageNotice = "storage_notice" | "backup_reminder" | "none";

export interface VisibleStorageNoticeInput {
  storageNoticeDismissed: boolean;
  reminder: BackupReminderState;
  snoozedUntil: string | null;
  now: Date;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** 保存方式の初回説明を確認済みかどうか */
export function isStorageNoticeDismissed(): boolean {
  if (!isBrowser()) return true;
  try {
    return localStorage.getItem(STORAGE_KEYS.storageNoticeDismissed) === "1";
  } catch {
    return true;
  }
}

export function dismissStorageNotice(): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.storageNoticeDismissed, "1");
  } catch {
    /* 確認済みの保存に失敗しても本処理は継続する */
  }
}

/**
 * 初回の保存説明とバックアップ促進のどちらを出すか。
 * 確認済みの説明は通常の再訪では出さない。延期中は促進も出さない。
 */
export function evaluateVisibleStorageNotice(
  input: VisibleStorageNoticeInput
): VisibleStorageNotice {
  if (!input.storageNoticeDismissed) {
    return "storage_notice";
  }
  if (isBackupReminderSnoozed(input.snoozedUntil, input.now)) {
    return "none";
  }
  if (!input.reminder.shouldRemind) {
    return "none";
  }
  return "backup_reminder";
}

/** 実データを読み取って、今出すべき案内だけを返す */
export async function getVisibleStorageNotice(
  now: Date = new Date()
): Promise<Result<VisibleStorageNotice>> {
  const dismissed = isStorageNoticeDismissed();
  if (!dismissed) {
    return ok("storage_notice");
  }

  const recordsResult = await repository.getAllRecords();
  if (!recordsResult.ok) {
    return ok("none");
  }

  const records = recordsResult.value;
  const oldestRecordAt =
    records.length > 0
      ? records.reduce(
          (oldest, record) =>
            record.createdAt < oldest ? record.createdAt : oldest,
          records[0].createdAt
        )
      : null;

  const reminder = evaluateBackupReminder({
    recordCount: records.length,
    oldestRecordAt,
    lastBackupAt: getLastBackupAt(),
    now,
  });

  return ok(
    evaluateVisibleStorageNotice({
      storageNoticeDismissed: true,
      reminder,
      snoozedUntil: getBackupSnoozedUntil(),
      now,
    })
  );
}
