/**
 * クラウド保存のログイン確認画面の経路。
 *
 * 通常のログインと、ログイン済みのまま6桁コードだけやり直す再認証とを
 * 同じ画面で扱う。再認証はログアウトしない（この端末の記録も消さない）。
 */

export const CLOUD_LOGIN_PATH = "/cloud-login";

/** 設定画面から「本人確認をやり直す」ときに開く。ログアウトはしない */
export const CLOUD_LOGIN_REAUTH_PATH = "/cloud-login?reauth=1";

/**
 * 画面の検索文字列が再認証の要求か。
 *
 * `reauth=1` のときだけ真。値の有無や別の値では通常のログインにする。
 * メールアドレスはここへ載せない。
 */
export function isCloudLoginReauthSearch(search: string): boolean {
  const query = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(query).get("reauth") === "1";
}
