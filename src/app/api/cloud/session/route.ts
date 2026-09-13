import { NextResponse } from "next/server";
import { isCloudBackupEnabled } from "@/lib/cloud-backup";
import { getCloudAuthStatus } from "@/lib/server/cloud-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

/**
 * ログイン確認画面が「クラウド保存を使える状態か」だけを尋ねる、軽い
 * 状態確認。`/api/cloud/snapshot` と違いDBには触れない。
 *
 * Better Authのセッションが有効でも、許可リストに無いメールアドレスなら
 * `not_allowed` を返す。ここで画面に返す3値は、`getCloudSession` が
 * 所有者として認める条件と完全に同じ判定（`getCloudAuthStatus`）から作る。
 * 画面側だけの別ロジックで「ログイン済みか」を判断させない。
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!isCloudBackupEnabled()) {
    return NextResponse.json({ ok: false }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ ok: false }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const status = await getCloudAuthStatus(request);

  if (status.status === "ok") {
    // `devOwner` は Preview専用の固定ID（USER_DATA_DEV_OWNER_ID）で通したとき
    // だけ真になる。本番では `getCloudAuthStatus` がこの抜け道を使わないため、
    // 常に出ない。画面がこの印を出すことで、「本物のログイン結果を見ている
    // つもりが、実は固定IDで通っていた」という取り違えを防ぐ
    return NextResponse.json(
      status.devOwner ? { ok: true, devOwner: true } : { ok: true },
      { headers: NO_STORE_HEADERS }
    );
  }

  if (status.status === "not_allowed") {
    return NextResponse.json(
      { ok: false, reason: "not_allowed" },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { ok: false, reason: "unauthenticated" },
    { status: 401, headers: NO_STORE_HEADERS }
  );
}
