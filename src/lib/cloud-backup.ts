/**
 * クラウドバックアップの共通定義。画面側とAPI側の両方から読む。
 *
 * 実装は進めるが、本番の入口は既定で閉じたままにする。
 * 詳細は `docs/account-cloud-storage-decision.md`。
 */

/**
 * 1回に預けるスナップショットの上限。実際の利用は1年で数百KB程度だが、
 * 壊れた入力や極端に大きい入力をAPIの手前で落とすために置く。
 */
export const MAX_SNAPSHOT_BYTES = 4_000_000;

/**
 * 残す世代の数。上書き保存で壊れた内容が唯一の控えになることを防ぐ。
 */
export const SNAPSHOT_GENERATIONS_KEPT = 3;

/** 端末を識別する文字列の形（推測されにくい乱数をそのまま使う） */
export const DEVICE_ID_PATTERN = /^[0-9a-f]{32}$/;

/**
 * クラウドバックアップの入口を開けるかどうか。
 *
 * 既定は閉じたまま。同意文面と手続き確認が終わるまで、本番画面から
 * クラウド保存へ到達できるようにしない。
 */
export function isCloudBackupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED === "true";
}

/**
 * 預けた内容と受け取った内容が同じかを照合するためのチェックサム。
 * ブラウザと Node のどちらでも動く Web Crypto を使う。
 */
export async function snapshotChecksum(payloadText: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payloadText)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** 端末の識別子を新しく作る */
export function createDeviceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
