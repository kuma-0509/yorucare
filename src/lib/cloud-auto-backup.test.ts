// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveCloudBackupConsent } from "./cloud-consent";
import { createEmptyRecordForm, type SaveRecordInput } from "./repository";
import { saveRecord } from "./storage";

/**
 * 記録を保存できたあと、自動でクラウドへ預け直すかどうか。
 * 送信の成否は記録の保存の成否と別に扱う（9.2節）。
 */

const fetchMock = vi.fn();

function form(date: string): SaveRecordInput {
  const { date: _date, ...rest } = createEmptyRecordForm(date);
  return { ...rest, moodScore: 3 };
}

/** 送信は待たずに進むため、非同期の処理が一巡するまで待つ */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("記録を保存したあとの自動送信", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          generation: 1,
          storedAt: "2026-09-08T22:14:00.000Z",
          recordCount: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    localStorage.clear();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
    }
  });

  it("同意していれば、保存できた直後に預け直す", async () => {
    saveCloudBackupConsent(true);

    const result = await saveRecord("2026-09-08", form("2026-09-08"));
    expect(result.ok).toBe(true);

    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/cloud/snapshot");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
  });

  it("同意していなければ、保存できても1件も送らない", async () => {
    saveCloudBackupConsent(false);

    const result = await saveRecord("2026-09-08", form("2026-09-08"));
    expect(result.ok).toBe(true);

    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("入口が閉じていれば送らない", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    saveCloudBackupConsent(true);

    await saveRecord("2026-09-08", form("2026-09-08"));

    await settle();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("送れなくても、記録の保存は成功のままにする", async () => {
    saveCloudBackupConsent(true);
    fetchMock.mockRejectedValue(new Error("通信できません"));

    const result = await saveRecord("2026-09-08", form("2026-09-08"));

    expect(result.ok).toBe(true);
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
