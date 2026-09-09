// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "./constants";
import {
  clearCloudSyncState,
  ensureDeviceId,
  evaluateSyncNotice,
  readCloudSyncState,
  STALE_SYNC_DAYS,
  writeCloudSyncState,
  type CloudSyncState,
} from "./cloud-sync-state";

const NOW = new Date("2026-09-08T12:00:00.000Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function state(overrides: Partial<CloudSyncState> = {}): CloudSyncState {
  return {
    deviceId: "a".repeat(32),
    lastSyncedAt: null,
    lastGeneration: null,
    handedOverAt: null,
    ...overrides,
  };
}

describe("cloud-sync-state", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("初回は端末の識別子を作って覚える", () => {
    const first = ensureDeviceId();
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(ensureDeviceId()).toBe(first);
  });

  it("書いた状態をそのまま読み戻せる", () => {
    const saved = state({ lastSyncedAt: daysAgo(1), lastGeneration: 3 });
    writeCloudSyncState(saved);
    expect(readCloudSyncState()).toEqual(saved);
  });

  it("記録本文を持たない", () => {
    writeCloudSyncState(state({ lastSyncedAt: daysAgo(1) }));
    const raw = localStorage.getItem(STORAGE_KEYS.cloudSync) ?? "";
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual([
      "deviceId",
      "handedOverAt",
      "lastGeneration",
      "lastSyncedAt",
    ]);
  });

  it("壊れていたら作り直す", () => {
    localStorage.setItem(STORAGE_KEYS.cloudSync, "{こわれている");
    expect(readCloudSyncState().deviceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("形式外の端末識別子は引き継がない", () => {
    localStorage.setItem(
      STORAGE_KEYS.cloudSync,
      JSON.stringify({ deviceId: "short", lastSyncedAt: daysAgo(1) })
    );
    const read = readCloudSyncState();
    expect(read.deviceId).not.toBe("short");
    expect(read.lastSyncedAt).toBeNull();
  });

  it("日時として読めない値は未設定として扱う", () => {
    localStorage.setItem(
      STORAGE_KEYS.cloudSync,
      JSON.stringify({ deviceId: "a".repeat(32), lastSyncedAt: "きのう" })
    );
    expect(readCloudSyncState().lastSyncedAt).toBeNull();
  });

  it("やめたときは端末側の状態も消す", () => {
    writeCloudSyncState(state());
    clearCloudSyncState();
    expect(localStorage.getItem(STORAGE_KEYS.cloudSync)).toBeNull();
  });

  describe("案内の出し分け", () => {
    it("最近預けられていれば何も出さない", () => {
      expect(
        evaluateSyncNotice(state({ lastSyncedAt: daysAgo(1) }), NOW)
      ).toEqual({ kind: "none" });
    });

    it("しきい値の手前では出さない", () => {
      expect(
        evaluateSyncNotice(
          state({ lastSyncedAt: daysAgo(STALE_SYNC_DAYS - 1) }),
          NOW
        )
      ).toEqual({ kind: "none" });
    });

    it("何日も預けられていないときだけ知らせる", () => {
      expect(
        evaluateSyncNotice(
          state({ lastSyncedAt: daysAgo(STALE_SYNC_DAYS) }),
          NOW
        )
      ).toEqual({ kind: "stale", daysSinceSync: STALE_SYNC_DAYS });
    });

    it("まだ一度も預けていない状態を区別する", () => {
      expect(evaluateSyncNotice(state(), NOW)).toEqual({
        kind: "never_synced",
      });
    });

    it("引き継ぎの案内は預け日時より優先する", () => {
      expect(
        evaluateSyncNotice(
          state({ lastSyncedAt: daysAgo(30), handedOverAt: daysAgo(2) }),
          NOW
        )
      ).toEqual({ kind: "handed_over", handedOverAt: daysAgo(2) });
    });
  });
});
