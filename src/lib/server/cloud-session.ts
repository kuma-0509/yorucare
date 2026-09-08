/**
 * 本人記録APIの入口で所有者を確定させる唯一の場所。
 *
 * ここが返した所有者IDだけを所有者として扱う。本文、URL、フォームから
 * 所有者IDを受け取らない。
 *
 * 認証そのものは Managed Better Auth（旧 Neon Auth）に任せる。実際の
 * セッション検証は、本人記録用Neonプロジェクトで Auth を有効化した時点で
 * このファイルへ組み込む。それまでは、後述のPreview用の抜け道を除いて
 * 常に未認証として扱うため、APIは 401 しか返さない。
 */

export type CloudSession = {
  ownerId: string;
  /** 直近の認証時刻。削除や退会の前に再認証を求めるときに使う */
  verifiedAt: Date;
};

/** 再認証を求める操作で「最近の認証」とみなす長さ */
const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000;

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

export async function getCloudSession(
  _request: Request
): Promise<CloudSession | null> {
  const ownerId = developmentOwnerId();
  if (ownerId) return { ownerId, verifiedAt: new Date() };

  // Managed Better Auth を有効化したら、ここで HttpOnly Cookie を検証し、
  // 検証済みユーザーIDを ownerId として返す。
  return null;
}

/** 削除・退会など、取り返しのつかない操作の前に確かめる */
export function isRecentlyVerified(
  session: CloudSession,
  now = new Date()
): boolean {
  return now.getTime() - session.verifiedAt.getTime() <= RECENT_AUTH_WINDOW_MS;
}
