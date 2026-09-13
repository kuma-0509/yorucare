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

export type CloudAuthState = {
  outcome: CloudAuthOutcome;
  /**
   * Preview専用の固定ID（`USER_DATA_DEV_OWNER_ID`）で通っているか。
   *
   * 真のときは、画面の「使える」表示が本物のログイン結果ではない。実機確認で
   * 「ログインできたつもり」「許可リストが効いているつもり」の取り違えが
   * 起きるため、画面はこの印を必ず本人に見せる。本番では常に偽。
   */
  devOwner: boolean;
};

/** 状態と、Preview専用の固定IDで通ったかどうかを合わせて取り出す */
export async function fetchCloudAuthState(): Promise<CloudAuthState> {
  try {
    const response = await fetch("/api/cloud/session", { method: "GET" });
    if (response.status === 200) {
      const body = (await response.json().catch(() => null)) as {
        devOwner?: unknown;
      } | null;
      return { outcome: "ok", devOwner: body?.devOwner === true };
    }
    if (response.status === 401) {
      return { outcome: "unauthenticated", devOwner: false };
    }
    if (response.status === 403) {
      const body = (await response.json().catch(() => null)) as {
        reason?: unknown;
      } | null;
      if (body?.reason === "not_allowed") {
        return { outcome: "not_allowed", devOwner: false };
      }
    }
  } catch {
    // 通信できない場合は判定不能として扱う
  }
  return { outcome: "unknown", devOwner: false };
}

export async function fetchCloudAuthOutcome(): Promise<CloudAuthOutcome> {
  return (await fetchCloudAuthState()).outcome;
}

/**
 * ログアウトなど、認証SDKの失敗を画面に出すときの補足。
 *
 * 「できませんでした」だけでは、実機確認でしか出ない失敗の原因を切り分け
 * られない（Preview環境は開発者ツールを開かないと応答が見えない）。そこで
 * HTTPの状態番号と、あれば短い符号だけを添える。メールアドレスや6桁コード
 * のような本人の情報は、SDKのエラーにも含まれないものだけを選んで出す。
 */
export function describeAuthError(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";

  const record = error as { status?: unknown; statusText?: unknown; code?: unknown };
  const parts: string[] = [];
  if (typeof record.status === "number") parts.push(String(record.status));

  const code =
    typeof record.code === "string"
      ? record.code
      : typeof record.statusText === "string"
        ? record.statusText
        : "";
  if (code) parts.push(code.slice(0, 40));

  return parts.length > 0 ? `（詳細: ${parts.join(" ")}）` : "";
}

/**
 * ログアウトが403で断られたときだけ出す手がかり。
 *
 * SDKは403をすべて `feature_not_supported` という名前に置き換えてしまうため、
 * 符号からは原因が分からない。この案件で実際に起きた403は、Managed Better Auth
 * の「Domains」に画面のURLが登録されていない場合だった（2026-09-11に実測。
 * ログインは通るのにサインアウトだけが失敗する）。検証用の画面でだけ出す。
 */
export function hintForSignOutError(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  if ((error as { status?: unknown }).status !== 403) return "";
  return "この画面のURLが、Managed Better Authの「Domains」に登録されていない可能性があります（下の「検証用の情報」の『この画面のURL』を、そのまま登録してください）。";
}
