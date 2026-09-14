/**
 * 削除・退会など、取り返しのつかない操作の前に「直近の本人確認」を確かめる。
 *
 * ここは意図的に何にも依存しない。認証基盤（`neon-auth.ts`）を読み込むと
 * この判定まで一緒に差し替えられてしまい、APIの守りがテスト用の置き換えで
 * 消えることがあるため、純粋な判定だけを切り出して置く。
 */

/** 再認証を求める操作で「最近の認証」とみなす長さ */
export const RECENT_AUTH_WINDOW_MS = 10 * 60 * 1000;

/** 直近の本人確認から十分に新しいか。Cookieが有効かどうかとは別の軸 */
export function isRecentlyVerified(
  session: { verifiedAt: Date },
  now = new Date()
): boolean {
  return now.getTime() - session.verifiedAt.getTime() <= RECENT_AUTH_WINDOW_MS;
}
