/**
 * 本人記録APIの入口で所有者を確定させる唯一の場所。
 *
 * ここが返した所有者IDだけを所有者として扱う。本文、URL、フォームから
 * 所有者IDを受け取らない。
 *
 * 認証そのものは Managed Better Auth（旧 Neon Auth）に任せる。HttpOnly
 * Cookie の検証は `@neondatabase/auth` の `getSession()` が行う。この関数は
 * Next.js のリクエストコンテキスト（`next/headers`）からCookieを読むため、
 * Route Handler内で呼び出せば引数なしでCookieを検証できる。
 *
 * 新規登録の抑止について: Managed Better Authの公式ドキュメント
 * （2026-09-08時点、認証フローのページ）は次のように明記しており、
 * Console設定だけで新規登録を確実に止められる保証がない。
 *
 *   "Anyone can sign up for your application by default.
 *    Support for restricted signups is coming soon."
 *
 * そのため、Console側の設定（`docs/handoff/latest.md` の手順書）に加えて、
 * ここでも運営者が用意した許可済みメールアドレスの一覧
 * （USER_DATA_ALLOWED_EMAILS）と突き合わせる二重の防御を行う。
 * 一覧が未設定の場合は誰も通さない（フェイルクローズ）。
 */

import { getNeonAuth } from "./neon-auth";

// 判定そのものは `cloud-reauth.ts` にある。これまでの参照先を変えずに済むよう
// ここからも出しておく
export { isRecentlyVerified, RECENT_AUTH_WINDOW_MS } from "./cloud-reauth";

export type CloudSession = {
  ownerId: string;
  /** 直近の認証時刻。削除や退会の前に再認証を求めるときに使う */
  verifiedAt: Date;
};

/**
 * ダミーデータでの検証用に、Preview環境だけで所有者IDを固定する抜け道。
 *
 * 本番では、環境変数が設定されていても使わない。実データを預ける経路を
 * 認証なしで開けないようにするため、ここは二重に塞いでおく。
 */
function developmentOwnerId(): string | null {
  if (process.env.VERCEL_ENV === "production") return null;
  const ownerId = process.env.USER_DATA_DEV_OWNER_ID ?? "";
  return ownerId.trim() ? ownerId.trim() : null;
}

/** 運営者が登録した参加者のメールアドレス一覧（カンマ区切り、小文字化して比較） */
function allowedEmails(): string[] {
  return (process.env.USER_DATA_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * 認証済みメールアドレスが許可リストに含まれるか。
 * 一覧が空（未設定）なら、設定漏れで誰でも通ってしまわないよう誰も通さない。
 */
function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = allowedEmails();
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

type SessionFields = {
  userId: string;
  expiresAt: unknown;
  createdAt: unknown;
};

type UserFields = {
  id: string;
  email?: string | null;
};

export async function getCloudSession(
  _request: Request
): Promise<CloudSession | null> {
  const devOwnerId = developmentOwnerId();
  if (devOwnerId) return { ownerId: devOwnerId, verifiedAt: new Date() };

  const auth = getNeonAuth();
  if (!auth) return null;

  let session: SessionFields | null | undefined;
  let user: UserFields | null | undefined;
  try {
    const result = await auth.getSession();
    if (result.error) return null;
    session = result.data?.session as SessionFields | null | undefined;
    user = result.data?.user as UserFields | null | undefined;
  } catch {
    // Cookieが無い・改ざんされている・上流呼び出しが失敗した場合はすべて未認証扱い
    return null;
  }

  if (!session || !user) return null;

  const expiresAt = toDate(session.expiresAt);
  if (expiresAt && expiresAt.getTime() <= Date.now()) return null;

  if (!isEmailAllowed(user.email)) return null;

  const verifiedAt = toDate(session.createdAt) ?? new Date();
  return { ownerId: user.id, verifiedAt };
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}
