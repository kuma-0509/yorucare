import { STORAGE_KEYS } from "./constants";
import { createDeviceId, DEVICE_ID_PATTERN } from "./cloud-backup";

/**
 * クラウドバックアップについて端末側が覚えていること。
 *
 * 記録本文は入れない。ここにあるのは、この端末の識別子と、最後にクラウドへ
 * 預けた日時、別の端末へ引き継がれた日時だけ。
 */
export type CloudSyncState = {
  deviceId: string;
  /** 最後にクラウドへ預けられた日時。まだ一度も預けていなければ null */
  lastSyncedAt: string | null;
  /** 最後に預かってもらえた世代。まだなければ null */
  lastGeneration: number | null;
  /**
   * 別の端末へ引き継がれた日時。値があるあいだ、この端末は送信を止めて
   * 案内を出す。記録の作成と閲覧はこれまでどおり続けられる
   */
  handedOverAt: string | null;
};

/**
 * 何日預けられていなければ本人へ知らせるか。
 * 1〜2日の通信断でいちいち知らせない長さにする。
 */
export const STALE_SYNC_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function emptyState(): CloudSyncState {
  return {
    deviceId: createDeviceId(),
    lastSyncedAt: null,
    lastGeneration: null,
    handedOverAt: null,
  };
}

/**
 * 端末側の状態を読む。壊れていた場合は作り直す。
 *
 * ここが読めなくても記録そのものは端末に残っているため、読み込み失敗を
 * 記録の失敗として扱わない。
 */
export function readCloudSyncState(): CloudSyncState {
  if (!isBrowser()) return emptyState();

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.cloudSync);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const deviceId = parsed.deviceId;
    if (typeof deviceId !== "string" || !DEVICE_ID_PATTERN.test(deviceId)) {
      return emptyState();
    }

    return {
      deviceId,
      lastSyncedAt: isIsoTimestamp(parsed.lastSyncedAt)
        ? parsed.lastSyncedAt
        : null,
      lastGeneration:
        typeof parsed.lastGeneration === "number" &&
        Number.isInteger(parsed.lastGeneration)
          ? parsed.lastGeneration
          : null,
      handedOverAt: isIsoTimestamp(parsed.handedOverAt)
        ? parsed.handedOverAt
        : null,
    };
  } catch {
    return emptyState();
  }
}

/** 端末側の状態を書く。書けなくても記録の保存は妨げない */
export function writeCloudSyncState(state: CloudSyncState): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.cloudSync, JSON.stringify(state));
  } catch {
    // 端末の保存容量がいっぱいでも、記録本体の保存を止めない
  }
}

/** この端末の識別子。無ければ作って覚える */
export function ensureDeviceId(): string {
  const state = readCloudSyncState();
  writeCloudSyncState(state);
  return state.deviceId;
}

/** クラウドをやめたときに端末側の状態も消す */
export function clearCloudSyncState(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS.cloudSync);
  } catch {
    // 消せなくても記録の読み書きには影響しない
  }
}

export type SyncNotice =
  | { kind: "none" }
  | { kind: "handed_over"; handedOverAt: string }
  | { kind: "stale"; daysSinceSync: number }
  | { kind: "never_synced" };

/**
 * 画面へ出す案内を決める。
 *
 * 送信の失敗をそのつど知らせない。何日も預けられていないときだけ、
 * 責めない言い方で知らせる。
 */
export function evaluateSyncNotice(
  state: CloudSyncState,
  now = new Date()
): SyncNotice {
  if (state.handedOverAt) {
    return { kind: "handed_over", handedOverAt: state.handedOverAt };
  }
  if (!state.lastSyncedAt) return { kind: "never_synced" };

  const daysSinceSync = Math.floor(
    (now.getTime() - Date.parse(state.lastSyncedAt)) / MS_PER_DAY
  );
  if (daysSinceSync >= STALE_SYNC_DAYS) {
    return { kind: "stale", daysSinceSync };
  }
  return { kind: "none" };
}
