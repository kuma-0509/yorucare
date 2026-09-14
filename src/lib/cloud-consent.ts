import { STORAGE_KEYS } from "./constants";

/**
 * クラウド保存への同意を、匿名分析の同意とは別に覚えておく。
 *
 * この2つは目的が違う（片方は本人の記録を預かる、もう片方は本文を含まない
 * 利用状況を数える）ため、片方をONにしても、もう片方は変えない。
 * 詳細は `docs/account-cloud-storage-decision.md` 4節。
 */

const GRANTED = "granted";
const DENIED = "denied";

export type CloudBackupConsent = "granted" | "denied" | "unset";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getCloudBackupConsent(): CloudBackupConsent {
  if (!isBrowser()) return "unset";

  try {
    const value = localStorage.getItem(STORAGE_KEYS.cloudBackupConsent);
    if (value === GRANTED || value === DENIED) return value;
    return "unset";
  } catch {
    return "unset";
  }
}

/** 同意していないあいだは1件も送らない。既定は「まだ決めていない」＝送らない */
export function hasCloudBackupConsent(): boolean {
  return getCloudBackupConsent() === GRANTED;
}

export function saveCloudBackupConsent(enabled: boolean): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      STORAGE_KEYS.cloudBackupConsent,
      enabled ? GRANTED : DENIED
    );
  } catch {
    // 保存できない場合は unset のままになり、送信は始まらない
  }
}
