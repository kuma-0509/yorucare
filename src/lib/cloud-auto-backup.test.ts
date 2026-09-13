// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetBackupQueueForTest } from "./cloud-sync";
import { saveCloudBackupConsent } from "./cloud-consent";
import { createEmptyRecordForm, type SaveRecordInput } from "./repository";
import {
  addNotToDoItem,
  addSelfCareItem,
  deleteRecord,
  saveRecord,
  saveReturnDate,
} from "./storage";

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
    _resetBackupQueueForTest();
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

  it("記録の削除も預け直す（消したはずの記録がクラウドに残らない）", async () => {
    saveCloudBackupConsent(true);
    await saveRecord("2026-09-08", form("2026-09-08"));
    await settle();
    fetchMock.mockClear();

    const result = await deleteRecord("2026-09-08");
    expect(result.ok).toBe(true);

    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
  });

  it("「できること」・「やらないこと」・復職日の変更も預け直す", async () => {
    saveCloudBackupConsent(true);

    await addSelfCareItem("散歩する");
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await addNotToDoItem("夜更かししない");
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await saveReturnDate("2026-10-01");
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("続けて保存しても送信は重ならず、最後にもう1回だけ送り直す", async () => {
    // 重なると、先に作った古い内容があとから届いて新しい世代になり、
    // 復元したときに保存したはずの変更が消える
    saveCloudBackupConsent(true);

    let release: (() => void) | null = null;
    const firstSent = new Promise<void>((resolve) => {
      release = resolve;
    });
    let call = 0;
    fetchMock.mockImplementation(async () => {
      call += 1;
      if (call === 1) await firstSent;
      return new Response(
        JSON.stringify({
          generation: call,
          storedAt: "2026-09-08T22:14:00.000Z",
          recordCount: 1,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    await saveRecord("2026-09-08", form("2026-09-08"));
    await settle();
    // 1件目の送信が終わっていないあいだは、2件目を送り始めない
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await saveRecord("2026-09-09", form("2026-09-09"));
    await saveRecord("2026-09-10", form("2026-09-10"));
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    release?.();
    await settle();
    await settle();

    // 待っていた2件は、まとめて最新の内容1回で送り直す
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
