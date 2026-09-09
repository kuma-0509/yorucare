/**
 * Managed Better Auth（旧 Neon Auth）のサーバーインスタンスを作る唯一の場所。
 *
 * `src/lib/server/cloud-session.ts`（セッション検証）と
 * `src/app/api/auth/[...path]/route.ts`（クライアントSDKからの認証リクエストの
 * 受け口）の両方から、このモジュール経由でだけ参照する。
 */

import { createNeonAuth } from "@neondatabase/auth/next/server";

/** SDKが要求するCookie署名鍵の最小長と揃える */
const MIN_COOKIE_SECRET_LENGTH = 32;

export type NeonAuthInstance = ReturnType<typeof createNeonAuth>;

let cachedAuth: NeonAuthInstance | null | undefined;

/**
 * 環境変数が揃っていれば Managed Better Auth のクライアントを返す。
 * 揃っていなければ null（=未設定として常に未認証扱い）。
 */
export function getNeonAuth(): NeonAuthInstance | null {
  if (cachedAuth !== undefined) return cachedAuth;

  const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "";
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET ?? "";

  if (!baseUrl || cookieSecret.length < MIN_COOKIE_SECRET_LENGTH) {
    cachedAuth = null;
    return cachedAuth;
  }

  cachedAuth = createNeonAuth({
    baseUrl,
    cookies: { secret: cookieSecret },
  });
  return cachedAuth;
}

/** テスト用に、キャッシュしたインスタンスを作り直させる */
export function _resetNeonAuthCacheForTest(): void {
  cachedAuth = undefined;
}
