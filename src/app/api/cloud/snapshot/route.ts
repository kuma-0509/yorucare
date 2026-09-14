import { NextResponse } from "next/server";
import {
  isCloudBackupEnabled,
  MAX_SNAPSHOT_BYTES,
  snapshotChecksum,
} from "@/lib/cloud-backup";
import { parseExportPayload, STORAGE_SCHEMA_VERSION } from "@/lib/schemas";
import { isRecentlyVerified } from "@/lib/server/cloud-reauth";
import { getCloudSession, type CloudSession } from "@/lib/server/cloud-session";
import {
  deleteAllUserData,
  getActiveDevice,
  getLatestSnapshot,
  saveSnapshot,
  UserDataConflictError,
  UserDataStoreUnavailableError,
} from "@/lib/server/user-data-store";
import { parseSnapshotUploadPayload } from "@/lib/snapshot-transfer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * 本人のスナップショットを預かる・返す・消す。
 *
 * ログへ出すのは操作種別と件数だけにする。記録本文、暗号文、メール、
 * Cookie、所有者ID、記録対象日はログにもレスポンスの誤りにも出さない。
 */

function errorResponse(status: number, body?: unknown): NextResponse {
  return NextResponse.json(body ?? { ok: false }, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function requireOwner(
  request: Request
): Promise<
  | { ok: true; ownerId: string; session: CloudSession }
  | { ok: false; status: number }
> {
  if (!isCloudBackupEnabled()) return { ok: false, status: 404 };
  if (!isSameOrigin(request)) return { ok: false, status: 403 };

  const session = await getCloudSession(request);
  if (!session) return { ok: false, status: 401 };
  return { ok: true, ownerId: session.ownerId, session };
}

/** 最新のスナップショットを返す。復元画面だけが呼ぶ */
export async function GET(request: Request): Promise<NextResponse> {
  const owner = await requireOwner(request);
  if (!owner.ok) return errorResponse(owner.status);

  try {
    const snapshot = await getLatestSnapshot(owner.ownerId);
    if (!snapshot) return errorResponse(404);

    return NextResponse.json(
      {
        generation: snapshot.generation,
        schemaVersion: snapshot.schemaVersion,
        recordCount: snapshot.recordCount,
        storedAt: snapshot.storedAt,
        payloadText: snapshot.payloadText,
        checksum: await snapshotChecksum(snapshot.payloadText),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return unavailableOrThrow(error);
  }
}

/** 端末が保存に成功した直後に呼ぶ。まるごと1件を上書き保存する */
export async function PUT(request: Request): Promise<NextResponse> {
  const owner = await requireOwner(request);
  if (!owner.ok) return errorResponse(owner.status);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_SNAPSHOT_BYTES) return errorResponse(413);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(415);
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_SNAPSHOT_BYTES) {
      return errorResponse(413);
    }
    body = JSON.parse(text) as unknown;
  } catch {
    return errorResponse(400);
  }

  const parsed = parseSnapshotUploadPayload(body);
  if (!parsed.ok) return errorResponse(400);

  // 途中で欠けた本文をそのまま控えにしないよう、預かる前に照合する
  if ((await snapshotChecksum(parsed.value.payloadText)) !== parsed.value.checksum) {
    return errorResponse(422);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(parsed.value.payloadText) as unknown;
  } catch {
    return errorResponse(400);
  }

  // 端末内の取り込みと同じ上限・スキーマで検証する
  const validated = parseExportPayload(payload);
  if (!validated.ok) return errorResponse(422);

  try {
    const active = await getActiveDevice(owner.ownerId);
    if (active && active.activeDeviceId !== parsed.value.deviceId) {
      // 別の端末へ引き継がれている。古い内容で上書きせず、停止状態にする
      return errorResponse(409, {
        ok: false,
        reason: "device_handed_over",
        claimedAt: active.claimedAt,
      });
    }

    const saved = await saveSnapshot({
      ownerId: owner.ownerId,
      payloadText: parsed.value.payloadText,
      schemaVersion: STORAGE_SCHEMA_VERSION,
      recordCount: validated.data.records.length,
    });

    return NextResponse.json(
      {
        generation: saved.generation,
        storedAt: saved.storedAt,
        recordCount: validated.data.records.length,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof UserDataConflictError) {
      return errorResponse(409, { ok: false, reason: "generation_conflict" });
    }
    return unavailableOrThrow(error);
  }
}

/**
 * クラウド停止と退会で使う。何度呼んでも成功として扱う。
 *
 * 取り返しのつかない操作なので、ログイン済みというだけでは実行しない。
 * 直近10分以内に本人確認をしていない場合は断り、画面側でやり直してもらう。
 * 置き忘れた端末や乗っ取られたセッションから、控えを全部消せないようにする。
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const owner = await requireOwner(request);
  if (!owner.ok) return errorResponse(owner.status);

  if (!isRecentlyVerified(owner.session)) {
    return errorResponse(403, { ok: false, reason: "reauth_required" });
  }

  try {
    await deleteAllUserData(owner.ownerId);
  } catch (error) {
    return unavailableOrThrow(error);
  }

  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}

function unavailableOrThrow(error: unknown): NextResponse {
  if (error instanceof UserDataStoreUnavailableError) {
    return errorResponse(503);
  }
  // 中身の分からない失敗も、内容を出さずに一時的な失敗として返す
  return new NextResponse(null, {
    status: 503,
    headers: { ...NO_STORE_HEADERS, "Retry-After": "60" },
  });
}
