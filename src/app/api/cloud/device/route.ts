import { NextResponse } from "next/server";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";
import { getCloudSession } from "@/lib/server/cloud-session";
import {
  claimDevice,
  getActiveDevice,
  UserDataStoreUnavailableError,
} from "@/lib/server/user-data-store";
import { parseDeviceClaimPayload } from "@/lib/snapshot-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 1_024;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * 同期する端末を1台に保つための入口。
 *
 * 復元を終えた端末がここで登録され、以前の端末は次の送信で 409 を受け取って
 * 停止状態になる。端末内の記録は消さない。
 */

function errorResponse(status: number): NextResponse {
  return NextResponse.json({ ok: false }, { status, headers: NO_STORE_HEADERS });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function requireOwner(
  request: Request
): Promise<{ ok: true; ownerId: string } | { ok: false; status: number }> {
  if (!isCloudBackupEnabled()) return { ok: false, status: 404 };
  if (!isSameOrigin(request)) return { ok: false, status: 403 };

  const session = await getCloudSession(request);
  if (!session) return { ok: false, status: 401 };
  return { ok: true, ownerId: session.ownerId };
}

/** この端末がまだ同期端末かを確かめる */
export async function GET(request: Request): Promise<NextResponse> {
  const owner = await requireOwner(request);
  if (!owner.ok) return errorResponse(owner.status);

  try {
    const active = await getActiveDevice(owner.ownerId);
    if (!active) return errorResponse(404);
    return NextResponse.json(active, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return unavailable(error);
  }
}

/** 復元を終えた端末を同期端末として登録する */
export async function POST(request: Request): Promise<NextResponse> {
  const owner = await requireOwner(request);
  if (!owner.ok) return errorResponse(owner.status);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
    return errorResponse(413);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(415);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return errorResponse(413);
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return errorResponse(400);
  }

  const parsed = parseDeviceClaimPayload(body);
  if (!parsed.ok) return errorResponse(400);

  try {
    const active = await claimDevice(owner.ownerId, parsed.value.deviceId);
    return NextResponse.json(active, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return unavailable(error);
  }
}

function unavailable(error: unknown): NextResponse {
  if (error instanceof UserDataStoreUnavailableError) return errorResponse(503);
  return new NextResponse(null, {
    status: 503,
    headers: { ...NO_STORE_HEADERS, "Retry-After": "60" },
  });
}
