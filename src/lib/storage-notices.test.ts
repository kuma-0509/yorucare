import { describe, expect, it } from "vitest";
import {
  BACKUP_REMINDER_INTERVAL_DAYS,
  BACKUP_SNOOZE_DAYS,
  evaluateBackupReminder,
  FIRST_BACKUP_GRACE_DAYS,
  isBackupReminderSnoozed,
} from "./backup-reminder";
import { evaluateVisibleStorageNotice } from "./storage-notices";

const NOW = new Date("2026-01-20T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function reminder(overrides: {
  recordCount?: number;
  oldestRecordAt?: string | null;
  lastBackupAt?: string | null;
}) {
  return evaluateBackupReminder({
    recordCount: overrides.recordCount ?? 2,
    oldestRecordAt: overrides.oldestRecordAt ?? daysAgo(FIRST_BACKUP_GRACE_DAYS),
    lastBackupAt: overrides.lastBackupAt ?? null,
    now: NOW,
  });
}

describe("evaluateVisibleStorageNotice", () => {
  it("未確認の初回説明があるときは、バックアップ促進より先に説明だけを出す", () => {
    expect(
      evaluateVisibleStorageNotice({
        storageNoticeDismissed: false,
        reminder: reminder({}),
        snoozedUntil: null,
        now: NOW,
      })
    ).toBe("storage_notice");
  });

  it("確認済みの説明は通常の再訪では出さない", () => {
    expect(
      evaluateVisibleStorageNotice({
        storageNoticeDismissed: true,
        reminder: reminder({
          recordCount: 0,
          oldestRecordAt: null,
        }),
        snoozedUntil: null,
        now: NOW,
      })
    ).toBe("none");
  });

  it("未バックアップで猶予を過ぎていれば促進する", () => {
    expect(
      evaluateVisibleStorageNotice({
        storageNoticeDismissed: true,
        reminder: reminder({ lastBackupAt: null }),
        snoozedUntil: null,
        now: NOW,
      })
    ).toBe("backup_reminder");
  });

  it("バックアップ実施済みで間隔未満なら促進しない", () => {
    expect(
      evaluateVisibleStorageNotice({
        storageNoticeDismissed: true,
        reminder: reminder({
          lastBackupAt: daysAgo(BACKUP_REMINDER_INTERVAL_DAYS - 1),
        }),
        snoozedUntil: null,
        now: NOW,
      })
    ).toBe("none");
  });

  it("あとで閉じた期限までは再表示しない", () => {
    const snoozedUntil = new Date(
      NOW.getTime() + BACKUP_SNOOZE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    expect(
      evaluateVisibleStorageNotice({
        storageNoticeDismissed: true,
        reminder: reminder({ lastBackupAt: null }),
        snoozedUntil,
        now: NOW,
      })
    ).toBe("none");
  });

  it("あとでの期限を過ぎたら再び促進する", () => {
    expect(
      evaluateVisibleStorageNotice({
        storageNoticeDismissed: true,
        reminder: reminder({ lastBackupAt: null }),
        snoozedUntil: daysAgo(BACKUP_SNOOZE_DAYS),
        now: NOW,
      })
    ).toBe("backup_reminder");
  });
});

describe("isBackupReminderSnoozed", () => {
  it("壊れた期限は延期として扱わない", () => {
    expect(isBackupReminderSnoozed("not-a-date", NOW)).toBe(false);
  });

  it("期限ちょうどは延期を終える", () => {
    expect(isBackupReminderSnoozed(NOW.toISOString(), NOW)).toBe(false);
  });
});
