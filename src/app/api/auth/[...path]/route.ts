import { NextResponse } from "next/server";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";
import { EMAIL_NOT_ALLOWED_CODE } from "@/lib/cloud-login-errors";
import { isEmailAllowed } from "@/lib/server/cloud-session";
import { getNeonAuth } from "@/lib/server/neon-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * クライアントSDK（`authClient`）からのサインイン・サインアウト等のリクエストを
 * Managed Better Auth へ橋渡しする受け口。
 *
 * `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` が有効でない限り 404 とし、本番画面から
 * 到達できない間はこの入口も閉じておく。
 *
 * Email OTP は未登録のメールアドレスに対しても自動でアカウントを作るため、
 * 許可リストの照合を `getCloudSession` まで先送りすると、一覧に無い人でも
 * コードを受け取ってアカウントを作れてしまう（記録の読み書きはできないが、
 * メールアドレスが認証基盤に残り、送信量も消費される）。そこで、メール
 * アドレスを含む要求はここで転送前に照合する。
 */

const MAX_REQUEST_BYTES = 8_192;

type RouteContext = { params: Promise<{ path: string[] }> };

function notFoundResponse(): NextResponse {
  return NextResponse.json({ ok: false }, { status: 404 });
}

function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { ok: false },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * 許可リスト拒否。本文に安定トークンを載せ、画面が通信失敗と区別できるようにする。
 * メールアドレスは返さない。
 */
function emailNotAllowedResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      code: EMAIL_NOT_ALLOWED_CODE,
      message: EMAIL_NOT_ALLOWED_CODE,
    },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * 本文にメールアドレスがあれば取り出す。読めない場合は null を返し、
 * 判断は Managed Better Auth 側へ委ねる（ここで形式検証はしない）。
 */
function extractEmail(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const email = (body as { email?: unknown }).email;
  return typeof email === "string" ? email : null;
}

async function withAuthHandler(
  method: "GET" | "POST",
  request: Request,
  context: RouteContext
): Promise<Response> {
  if (!isCloudBackupEnabled()) return notFoundResponse();

  const auth = getNeonAuth();
  if (!auth) return notFoundResponse();

  const handler = auth.handler();
  if (method === "GET") return handler.GET(request, context);

  // 本文は一度しか読めないため、読んだ内容で同じ要求を組み直して転送する
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
    return forbiddenResponse();
  }

  let body: unknown;
  try {
    body = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    body = null;
  }

  const email = extractEmail(body);
  if (email !== null && !isEmailAllowed(email)) return emailNotAllowedResponse();

  return handler.POST(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: text,
    }),
    context
  );
}

export async function GET(request: Request, context: RouteContext) {
  return withAuthHandler("GET", request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return withAuthHandler("POST", request, context);
}
