/**
 * `GET /api/cloud/session`（`getCloudAuthStatus`）を叩き、結果を4値に正規化する。
 *
 * サーバー側の判定だけを正とする。Better Authのセッション有無を画面が自分で
 * 判断すると、許可リストに無いメールアドレスでも「ログインできている」と
 * 扱ってしまう（記録APIは401で拒否するが、画面の表示だけが食い違う）。
 * ログイン確認画面（`/cloud-login`）とクラウド保存の設定画面の両方が、
 * この関数を通して同じ基準で判定する。
 *
 * `unknown`（通信できない・想定外の応答）は「未認証」ではない。呼び出し側が
 * 状況に応じて扱いを決める。
 */
export type CloudAuthOutcome = "ok" | "not_allowed" | "unauthenticated" | "unknown";

export async function fetchCloudAuthOutcome(): Promise<CloudAuthOutcome> {
  try {
    const response = await fetch("/api/cloud/session", { method: "GET" });
    if (response.status === 200) return "ok";
    if (response.status === 401) return "unauthenticated";
    if (response.status === 403) {
      const body = (await response.json().catch(() => null)) as {
        reason?: unknown;
      } | null;
      if (body?.reason === "not_allowed") return "not_allowed";
    }
  } catch {
    // 通信できない場合は判定不能として扱う
  }
  return "unknown";
}
