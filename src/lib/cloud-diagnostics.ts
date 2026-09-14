/**
 * `GET /api/cloud/diagnostics`（検証用の状態確認）を読む。
 *
 * 本番では経路そのものが404になるため、ここは常に null を返す。
 * 画面はこの関数が null を返したときは何も出さない。
 */
export type CloudDiagnostics = {
  vercelEnv: string | null;
  origin: string;
  commit: string | null;
  branch: string | null;
  cloudBackupEnabled: boolean;
  allowedEmailCount: number;
  devOwnerConfigured: boolean;
  authBaseUrlConfigured: boolean;
  authBaseUrlValid: boolean;
  authBaseHost: string | null;
  cookieSecretConfigured: boolean;
  session: "ok" | "not_allowed" | "unauthenticated";
  devOwnerInUse: boolean;
  upstream: { reachable: boolean; status?: number; code?: string };
};

export async function fetchCloudDiagnostics(): Promise<CloudDiagnostics | null> {
  try {
    const response = await fetch("/api/cloud/diagnostics", { method: "GET" });
    if (!response.ok) return null;
    return (await response.json()) as CloudDiagnostics;
  } catch {
    return null;
  }
}

/** 画面に出す1行ずつの並び。秘密は含まれない（件数・ホスト名・状態だけ） */
export function describeDiagnostics(
  diagnostics: CloudDiagnostics
): { label: string; value: string }[] {
  const upstream = diagnostics.upstream.reachable
    ? `届く（${diagnostics.upstream.status}）`
    : `届かない（${diagnostics.upstream.code ?? "不明"}）`;

  return [
    { label: "環境", value: diagnostics.vercelEnv ?? "（ローカル）" },
    { label: "この画面のURL", value: diagnostics.origin },
    {
      label: "いま動いているコミット",
      value: diagnostics.commit
        ? `${diagnostics.commit}${diagnostics.branch ? `（${diagnostics.branch}）` : ""}`
        : "不明",
    },
    { label: "許可リストの件数", value: `${diagnostics.allowedEmailCount}件` },
    {
      label: "検証用の固定ID",
      value: diagnostics.devOwnerConfigured
        ? diagnostics.devOwnerInUse
          ? "設定あり（いまこれで通っている）"
          : "設定あり（いまは使っていない）"
        : "設定なし",
    },
    {
      label: "認証基盤",
      value: diagnostics.authBaseUrlConfigured
        ? diagnostics.authBaseUrlValid
          ? `${diagnostics.authBaseHost} / ${upstream}`
          : "URLの形が不正"
        : "未設定",
    },
    {
      label: "Cookieの鍵",
      value: diagnostics.cookieSecretConfigured ? "設定あり" : "未設定または短い",
    },
    { label: "いまのログイン判定", value: diagnostics.session },
  ];
}
