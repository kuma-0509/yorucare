import { NextResponse } from "next/server";
import {
  parseAnalyticsDeletionPayload,
  parseAnalyticsEventPayload,
} from "@/lib/analytics-events";
import {
  deleteAnonymousInstallEvents,
  saveAnonymousEvent,
} from "@/lib/server/analytics-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 4_096;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function errorResponse(status: number): NextResponse {
  return NextResponse.json(
    { ok: false },
    { status, headers: NO_STORE_HEADERS }
  );
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readJson(request: Request): Promise<
  | { ok: true; value: unknown }
  | { ok: false; status: number }
> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return { ok: false, status: 413 };
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415 };
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return { ok: false, status: 413 };
    }
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400 };
  }
}

/**
 * 本人が任意同意した匿名利用イベントだけを保存する。
 *
 * 記録本文、健康・服薬・面談内容、研究参加者ID、個人情報は受け付けない。
 * 許可イベントとメタデータは parseAnalyticsEventPayload で固定し、
 * installId と eventId は保存前に HMAC-SHA256 で不可逆化する。
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return errorResponse(403);

  const body = await readJson(request);
  if (!body.ok) return errorResponse(body.status);

  const parsed = parseAnalyticsEventPayload(body.value);
  if (!parsed.ok) return errorResponse(400);

  try {
    await saveAnonymousEvent(parsed.value);
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        ...NO_STORE_HEADERS,
        "Retry-After": "60",
      },
    });
  }

  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

/**
 * 送信停止時に、現在の端末・ブラウザに対応する匿名イベントを削除する。
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return errorResponse(403);

  const body = await readJson(request);
  if (!body.ok) return errorResponse(body.status);

  const parsed = parseAnalyticsDeletionPayload(body.value);
  if (!parsed.ok) return errorResponse(400);

  try {
    await deleteAnonymousInstallEvents(parsed.value.installId);
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        ...NO_STORE_HEADERS,
        "Retry-After": "60",
      },
    });
  }

  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}
