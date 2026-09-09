import { NextResponse } from "next/server";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";
import { getNeonAuth } from "@/lib/server/neon-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * クライアントSDK（`authClient`）からのサインイン・サインアウト等のリクエストを
 * Managed Better Auth へ橋渡しする受け口。
 *
 * `NEXT_PUBLIC_CLOUD_BACKUP_ENABLED` が有効でない限り 404 とし、本番画面から
 * 到達できない間はこの入口も閉じておく。
 */

type RouteContext = { params: Promise<{ path: string[] }> };

function notFoundResponse(): NextResponse {
  return NextResponse.json({ ok: false }, { status: 404 });
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
  return handler[method](request, context);
}

export async function GET(request: Request, context: RouteContext) {
  return withAuthHandler("GET", request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return withAuthHandler("POST", request, context);
}
