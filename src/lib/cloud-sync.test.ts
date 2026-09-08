// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapshotChecksum } from "./cloud-backup";
import {
  claimThisDevice,
  deleteCloudData,
  fetchCloudSnapshot,
  planRestore,
  pushSnapshot,
  requiresLocalBackup,
  summarizePayload,
} from "./cloud-sync";
import { readCloudSyncState, writeCloudSyncState } from "./cloud-sync-state";
import type { ExportPayload } from "./schemas";

const DEVICE_ID = "a".repeat(32);

function payload(dates: string[] = []): ExportPayload {
  return {
    version: 1,
    exportedAt: "2026-09-08T12:00:00.000Z",
    returnDate: null,
    records: dates.map((date) => ({
      id: `id-${date}`,
      date,
      moodScore: 3,
      moodLabels: [],
      sleepStart: null,
      sleepEnd: null,
      sleepMinutes: null,
      medication: "none",
      warningLevel: "none",
      warningTags: [],
      warningNote: "",
      selfCareIds: [],
      notToDoIds: [],
      selfCareMemo: "",
      selfCareFeeling: null,
      note: "",
      tomorrowGoal: "",
      goalReviewStatus: null,
      createdAt: "2026-09-08T12:00:00.000Z",
      updatedAt: "2026-09-08T12:00:00.000Z",
    })) as ExportPayload["records"],
    selfCareItems: [],
    notToDoItems: [],
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("cloud-sync", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    localStorage.clear();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    writeCloudSyncState({
      deviceId: DEVICE_ID,
      lastSyncedAt: null,
      lastGeneration: null,
      handedOverAt: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
    }
  });

  describe("預ける", () => {
    it("入口が閉じていれば送信しない", async () => {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
      await expect(pushSnapshot("{}")).resolves.toEqual({ status: "off" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("端末の識別子と照合用の値を添えて送る", async () => {
      const payloadText = JSON.stringify(payload(["2026-09-08"]));
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          generation: 1,
          storedAt: "2026-09-08T12:00:01.000Z",
        })
      );

      await pushSnapshot(payloadText);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/cloud/snapshot");
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body)).toEqual({
        deviceId: DEVICE_ID,
        payloadText,
        checksum: await snapshotChecksum(payloadText),
      });
    });

    it("預かってもらえたら最終預け日時を覚える", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          generation: 4,
          storedAt: "2026-09-08T12:00:01.000Z",
        })
      );

      await expect(pushSnapshot("{}")).resolves.toEqual({
        status: "synced",
        generation: 4,
        storedAt: "2026-09-08T12:00:01.000Z",
      });
      expect(readCloudSyncState()).toMatchObject({
        lastSyncedAt: "2026-09-08T12:00:01.000Z",
        lastGeneration: 4,
        handedOverAt: null,
      });
    });

    it("通信断は静かに次へ回し、最終預け日時を変えない", async () => {
      fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
      await expect(pushSnapshot("{}")).resolves.toEqual({ status: "deferred" });
      expect(readCloudSyncState().lastSyncedAt).toBeNull();
    });

    it("サーバーが一時的に応えられないときも静かに次へ回す", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
      await expect(pushSnapshot("{}")).resolves.toEqual({ status: "deferred" });
    });

    it("別の端末へ引き継がれていたら送信を止めて日付を覚える", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(409, {
          ok: false,
          reason: "device_handed_over",
          claimedAt: "2026-09-07T00:00:00.000Z",
        })
      );

      await expect(pushSnapshot("{}")).resolves.toEqual({
        status: "handed_over",
        handedOverAt: "2026-09-07T00:00:00.000Z",
      });
      expect(readCloudSyncState().handedOverAt).toBe(
        "2026-09-07T00:00:00.000Z"
      );
    });

    it("引き継がれた後は送信そのものを試みない", async () => {
      writeCloudSyncState({
        deviceId: DEVICE_ID,
        lastSyncedAt: null,
        lastGeneration: null,
        handedOverAt: "2026-09-07T00:00:00.000Z",
      });

      await expect(pushSnapshot("{}")).resolves.toMatchObject({
        status: "handed_over",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("ログインしていなければ何もしない", async () => {
      fetchMock.mockResolvedValue(jsonResponse(401, { ok: false }));
      await expect(pushSnapshot("{}")).resolves.toEqual({ status: "off" });
    });
  });

  describe("取り出す", () => {
    it("控えがなければ空として返す", async () => {
      fetchMock.mockResolvedValue(jsonResponse(404, { ok: false }));
      await expect(fetchCloudSnapshot()).resolves.toEqual({ status: "empty" });
    });

    it("取り出した控えを検証してから返す", async () => {
      const payloadText = JSON.stringify(payload(["2026-09-08"]));
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          payloadText,
          checksum: await snapshotChecksum(payloadText),
          storedAt: "2026-09-08T12:00:01.000Z",
        })
      );

      const result = await fetchCloudSnapshot();
      expect(result.status).toBe("found");
      if (result.status !== "found") return;
      expect(result.payload.records).toHaveLength(1);
    });

    it("照合が合わない控えは端末へ書き戻さない", async () => {
      const payloadText = JSON.stringify(payload(["2026-09-08"]));
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          payloadText,
          checksum: "0".repeat(64),
          storedAt: "2026-09-08T12:00:01.000Z",
        })
      );

      await expect(fetchCloudSnapshot()).resolves.toEqual({
        status: "unavailable",
      });
    });

    it("形式が合わない控えを「記録なし」と取り違えない", async () => {
      const payloadText = JSON.stringify({ version: 99 });
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          payloadText,
          checksum: await snapshotChecksum(payloadText),
          storedAt: "2026-09-08T12:00:01.000Z",
        })
      );

      await expect(fetchCloudSnapshot()).resolves.toEqual({
        status: "unavailable",
      });
    });
  });

  describe("端末の登録と削除", () => {
    it("登録できたら引き継ぎの案内を消す", async () => {
      writeCloudSyncState({
        deviceId: DEVICE_ID,
        lastSyncedAt: null,
        lastGeneration: null,
        handedOverAt: "2026-09-07T00:00:00.000Z",
      });
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          activeDeviceId: DEVICE_ID,
          claimedAt: "2026-09-08T12:00:00.000Z",
        })
      );

      await expect(claimThisDevice()).resolves.toBe(true);
      expect(readCloudSyncState().handedOverAt).toBeNull();
    });

    it("登録できなければ状態を変えない", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
      await expect(claimThisDevice()).resolves.toBe(false);
    });

    it("削除は204のときだけ成功として扱う", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await expect(deleteCloudData()).resolves.toBe(true);

      fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
      await expect(deleteCloudData()).resolves.toBe(false);
    });
  });

  describe("復元の見せ方", () => {
    it("件数と期間だけを取り出す", () => {
      expect(
        summarizePayload(payload(["2026-09-08", "2026-09-01", "2026-09-05"]))
      ).toEqual({
        recordCount: 3,
        selfCareCount: 0,
        notToDoCount: 0,
        firstDate: "2026-09-01",
        lastDate: "2026-09-08",
      });
    });

    it("端末が空ならクラウドから戻す", () => {
      const plan = planRestore(payload([]), payload(["2026-09-08"]));
      expect(plan.kind).toBe("restore_cloud");
      expect(requiresLocalBackup(plan)).toBe(false);
    });

    it("クラウドが空なら預けるだけ", () => {
      const plan = planRestore(payload(["2026-09-08"]), null);
      expect(plan.kind).toBe("upload_local");
      expect(requiresLocalBackup(plan)).toBe(false);
    });

    it("両方に記録があれば自動で決めず、本人に選ばせる", () => {
      const plan = planRestore(
        payload(["2026-09-07", "2026-09-08"]),
        payload(["2026-08-01"])
      );
      expect(plan).toMatchObject({
        kind: "choice_required",
        local: { recordCount: 2 },
        cloud: { recordCount: 1 },
      });
    });

    it("選ばせる場面では先にJSONバックアップを求める", () => {
      const plan = planRestore(
        payload(["2026-09-08"]),
        payload(["2026-08-01"])
      );
      expect(requiresLocalBackup(plan)).toBe(true);
    });

    it("どちらにも記録がなければ何もしない", () => {
      expect(planRestore(payload([]), payload([])).kind).toBe("nothing_to_do");
    });
  });
});
