import { NextResponse } from "next/server";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";
import { getCloudAuthStatus } from "@/lib/server/cloud-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/** 上流（Managed Better Auth）へ届くかを確かめるときの待ち時間 */
const UPSTREAM_PROBE_TIMEOUT_MS = 3_000;

/**
 * 検証用の状態確認。**本番では存在しない扱い（404）**。
 *
 * Preview環境の実機確認で、いちばん時間を失うのが「いま見ている画面が、
 * どのデプロイの、どの設定で動いているのか分からない」ことだった。Vercelは
 * デプロイのたびに新しいURLを発行し、環境変数はデプロイごとに焼き付くため、
 * 設定を直して再デプロイしても、古いURLを開いたままなら何も変わらない。
 *
 * そこで、原因の切り分けに必要な事実だけを返す。**秘密は返さない**。
 * メールアドレスは件数だけ、認証基盤のURLはホスト名だけにとどめる。
 */
type Diagnostics = {
  /** どのデプロイを見ているか */
  vercelEnv: string | null;
  commit: string | null;
  branch: string | null;
  /** 設定が入っているか（中身は返さない） */
  cloudBackupEnabled: boolean;
  allowedEmailCount: number;
  devOwnerConfigured: boolean;
  authBaseUrlConfigured: boolean;
  authBaseUrlValid: boolean;
  authBaseHost: string | null;
  cookieSecretConfigured: boolean;
  /** いまのCookieでの判定 */
  session: "ok" | "not_allowed" | "unauthenticated";
  devOwnerInUse: boolean;
  /** 上流へ実際に届くか */
  upstream: { reachable: boolean; status?: number; code?: string };
};

function countAllowedEmails(): number {
  return (process.env.USER_DATA_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0).length;
}

/**
 * 上流へGETを1回だけ投げ、届くかどうかだけを見る。認証は要らない経路を使い、
 * 応答の中身は読まない（状態番号だけを返す）。
 */
async function probeUpstream(
  baseUrl: string
): Promise<Diagnostics["upstream"]> {
  let url: URL;
  try {
    url = new URL(`${baseUrl.replace(/\/+$/, "")}/jwt`);
  } catch {
    return { reachable: false, code: "INVALID_BASE_URL" };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(UPSTREAM_PROBE_TIMEOUT_MS),
    });
    return { reachable: true, status: response.status };
  } catch (error) {
    const code =
      error instanceof Error
        ? ((error as { code?: string }).code ?? error.name)
        : "UNKNOWN";
    return { reachable: false, code };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  // 本番では、設定の様子を外から確かめられる経路を一切開けない
  if (process.env.VERCEL_ENV === "production" || !isCloudBackupEnabled()) {
    return NextResponse.json(
      { ok: false },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { ok: false },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  const authBaseUrl = (process.env.NEON_AUTH_BASE_URL ?? "").trim();
  let authBaseHost: string | null = null;
  let authBaseUrlValid = false;
  if (authBaseUrl) {
    try {
      authBaseHost = new URL(authBaseUrl).host;
      authBaseUrlValid = true;
    } catch {
      authBaseUrlValid = false;
    }
  }

  const status = await getCloudAuthStatus(request);

  const diagnostics: Diagnostics = {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    cloudBackupEnabled: true,
    allowedEmailCount: countAllowedEmails(),
    devOwnerConfigured: Boolean((process.env.USER_DATA_DEV_OWNER_ID ?? "").trim()),
    authBaseUrlConfigured: authBaseUrl.length > 0,
    authBaseUrlValid,
    authBaseHost,
    cookieSecretConfigured: (process.env.NEON_AUTH_COOKIE_SECRET ?? "").length >= 32,
    session: status.status,
    devOwnerInUse: status.status === "ok" && status.devOwner === true,
    upstream: authBaseUrlValid
      ? await probeUpstream(authBaseUrl)
      : { reachable: false, code: "INVALID_BASE_URL" },
  };

  return NextResponse.json(diagnostics, { headers: NO_STORE_HEADERS });
}
