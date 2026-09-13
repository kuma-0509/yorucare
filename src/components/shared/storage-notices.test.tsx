// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackupReminderBanner } from "./backup-reminder-banner";
import { StorageNoticeBanner } from "./storage-notice-banner";
import { COPY } from "@/lib/copy";
import { STORAGE_KEYS } from "@/lib/constants";
import { FIRST_BACKUP_GRACE_DAYS } from "@/lib/backup-reminder";
import type { DailyRecord } from "@/lib/types";

const getAllRecords = vi.fn();

vi.mock("@/lib/repository", () => ({
  repository: {
    getAllRecords: () => getAllRecords(),
  },
}));

const NOW = new Date("2026-01-20T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeRecord(createdAt: string): DailyRecord {
  return {
    id: "r1",
    date: createdAt.slice(0, 10),
    moodScore: 2,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    sleepMinutes: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt,
    updatedAt: createdAt,
  };
}

function renderNotices(refreshKey = 0, onDismissed?: () => void) {
  return render(
    <>
      <StorageNoticeBanner refreshKey={refreshKey} onDismissed={onDismissed} />
      <BackupReminderBanner refreshKey={refreshKey} />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  getAllRecords.mockResolvedValue({
    ok: true,
    value: [makeRecord(daysAgo(FIRST_BACKUP_GRACE_DAYS))],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("保存案内の表示", () => {
  it("未確認なら初回説明だけを出し、バックアップ促進は出さない", async () => {
    renderNotices();

    expect(await screen.findByTestId("storage-notice-banner")).toBeTruthy();
    expect(screen.getByText(COPY.storageDeviceOnly)).toBeTruthy();
    expect(screen.getByText(COPY.storageMayBeLost)).toBeTruthy();
    expect(screen.queryByTestId("backup-reminder-banner")).toBeNull();
  });

  it("わかりましたのあと、通常の再訪では初回説明を出さない", async () => {
    const { rerender } = renderNotices();

    fireEvent.click(await screen.findByRole("button", { name: COPY.storageDismiss }));
    expect(screen.queryByTestId("storage-notice-banner")).toBeNull();

    rerender(
      <>
        <StorageNoticeBanner refreshKey={1} />
        <BackupReminderBanner refreshKey={1} />
      </>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("storage-notice-banner")).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_KEYS.storageNoticeDismissed)).toBe("1");
  });

  it("確認済みで未バックアップなら促進だけを出す", async () => {
    localStorage.setItem(STORAGE_KEYS.storageNoticeDismissed, "1");
    renderNotices();

    expect(await screen.findByTestId("backup-reminder-banner")).toBeTruthy();
    expect(screen.queryByTestId("storage-notice-banner")).toBeNull();
  });

  it("バックアップ実施済みなら促進しない", async () => {
    localStorage.setItem(STORAGE_KEYS.storageNoticeDismissed, "1");
    localStorage.setItem(STORAGE_KEYS.lastBackupAt, daysAgo(1));
    renderNotices();

    await waitFor(() => {
      expect(getAllRecords).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("backup-reminder-banner")).toBeNull();
    expect(screen.queryByTestId("storage-notice-banner")).toBeNull();
  });

  it("あとで閉じると期限までは再表示しない", async () => {
    localStorage.setItem(STORAGE_KEYS.storageNoticeDismissed, "1");
    const { rerender } = renderNotices();

    fireEvent.click(
      await screen.findByRole("button", { name: COPY.backupReminderSnooze })
    );
    expect(screen.queryByTestId("backup-reminder-banner")).toBeNull();
    expect(
      localStorage.getItem(STORAGE_KEYS.backupReminderSnoozedUntil)
    ).toBeTruthy();

    rerender(
      <>
        <StorageNoticeBanner refreshKey={1} />
        <BackupReminderBanner refreshKey={1} />
      </>
    );

    await waitFor(() => {
      expect(getAllRecords).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("backup-reminder-banner")).toBeNull();
  });
});
