import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 匿名利用イベントの収集エンドポイント（パイロット検証用）。
 *
 * 現状は受信内容をサーバログに出力するだけの最小実装。
 * D1/D7/D14 継続率を実際に集計するには、ここから永続ストア
 * （例: Vercel KV / Postgres など）へ書き込む処理を足す。
 * 永続化先の選定は Phase 2 のインフラ判断（docs/phase2-plan.md）に含める。
 *
 * 受け取るのは個人を特定しない値のみ（匿名 installId・イベント名・日付・件数など）。
 */

const ALLOWED_EVENTS = new Set([
  "record_saved",
  "first_record_saved",
  "backup_exported",
  "backup_imported",
  "tab_viewed",
]);

type IncomingEvent = {
  installId?: unknown;
  name?: unknown;
  at?: unknown;
  meta?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  let payload: IncomingEvent;
  try {
    payload = (await request.json()) as IncomingEvent;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const installId = typeof payload.installId === "string" ? payload.installId : "";
  const name = typeof payload.name === "string" ? payload.name : "";

  if (!installId || !ALLOWED_EVENTS.has(name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const record = {
    installId: installId.slice(0, 80),
    name,
    at: typeof payload.at === "string" ? payload.at : new Date().toISOString(),
    meta:
      payload.meta && typeof payload.meta === "object" ? payload.meta : undefined,
    receivedAt: new Date().toISOString(),
  };

  // TODO(phase2): 永続ストアへ保存して継続率を集計する。
  console.log("[yorucare:event]", JSON.stringify(record));

  return new NextResponse(null, { status: 204 });
}
