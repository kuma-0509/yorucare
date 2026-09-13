// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  BACKUP_REMINDER_INTERVAL_DAYS,
  BACKUP_SNOOZE_DAYS,
  evaluateBackupReminder,
  FIRST_BACKUP_GRACE_DAYS,
  recordBackupDone,
  snoozeBackupReminder,
} from "./backup-reminder";
import { STORAGE_KEYS } from "./constants";

const NOW = new Date("2026-01-20T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("evaluateBackupReminder", () => {
  it("記録が0件なら促さない", () => {
    const state = evaluateBackupReminder({
      recordCount: 0,
      oldestRecordAt: null,
      lastBackupAt: null,
      now: NOW,
    });
    expect(state.shouldRemind).toBe(false);
  });

  it("未バックアップ＆記録開始から猶予内なら促さない", () => {
    const state = evaluateBackupReminder({
      recordCount: 2,
      oldestRecordAt: daysAgo(FIRST_BACKUP_GRACE_DAYS - 1),
      lastBackupAt: null,
      now: NOW,
    });
    expect(state.shouldRemind).toBe(false);
  });

  it("未バックアップ＆記録開始から猶予を過ぎたら促す", () => {
    const state = evaluateBackupReminder({
      recordCount: 2,
      oldestRecordAt: daysAgo(FIRST_BACKUP_GRACE_DAYS),
      lastBackupAt: null,
      now: NOW,
    });
    expect(state.shouldRemind).toBe(true);
    expect(state.daysSinceBackup).toBeNull();
  });

  it("前回バックアップから間隔未満なら促さない", () => {
    const state = evaluateBackupReminder({
      recordCount: 5,
      oldestRecordAt: daysAgo(30),
      lastBackupAt: daysAgo(BACKUP_REMINDER_INTERVAL_DAYS - 1),
      now: NOW,
    });
    expect(state.shouldRemind).toBe(false);
    expect(state.daysSinceBackup).toBe(BACKUP_REMINDER_INTERVAL_DAYS - 1);
  });

  it("前回バックアップから間隔以上なら促す", () => {
    const state = evaluateBackupReminder({
      recordCount: 5,
      oldestRecordAt: daysAgo(30),
      lastBackupAt: daysAgo(BACKUP_REMINDER_INTERVAL_DAYS),
      now: NOW,
    });
    expect(state.shouldRemind).toBe(true);
    expect(state.daysSinceBackup).toBe(BACKUP_REMINDER_INTERVAL_DAYS);
  });
});

describe("バックアップ促進の端末内状態", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("あとでは再表示期限だけを残し、バックアップ済みにはしない", () => {
    snoozeBackupReminder(NOW);
    const until = localStorage.getItem(STORAGE_KEYS.backupReminderSnoozedUntil);
    expect(until).toBe(
      new Date(
        NOW.getTime() + BACKUP_SNOOZE_DAYS * 24 * 60 * 60 * 1000
      ).toISOString()
    );
    expect(localStorage.getItem(STORAGE_KEYS.lastBackupAt)).toBeNull();
  });

  it("保存成功時はバックアップ時刻を残し、延期期限は消す", () => {
    snoozeBackupReminder(NOW);
    recordBackupDone(NOW);
    expect(localStorage.getItem(STORAGE_KEYS.lastBackupAt)).toBe(
      NOW.toISOString()
    );
    expect(
      localStorage.getItem(STORAGE_KEYS.backupReminderSnoozedUntil)
    ).toBeNull();
  });
});
