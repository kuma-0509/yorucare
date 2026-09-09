import { isCloudBackupEnabled, snapshotChecksum } from "./cloud-backup";
import { hasCloudBackupConsent } from "./cloud-consent";
import {
  readCloudSyncState,
  writeCloudSyncState,
  type CloudSyncState,
} from "./cloud-sync-state";
import { repository } from "./repository";
import { parseExportPayload, type ExportPayload } from "./schemas";

/**
 * 端末とクラウドのやり取り。
 *
 * ここでの失敗は記録の保存の失敗ではない。端末への保存はすでに終わっている
 * ため、送信できなかった場合は静かに次の機会へ回す。
 */

const SNAPSHOT_URL = "/api/cloud/snapshot";
const DEVICE_URL = "/api/cloud/device";

export type PushResult =
  /** 入口が閉じている、同意していない、またはログインしていない。何もしない */
  | { status: "off" }
  /** 預かってもらえた */
  | { status: "synced"; storedAt: string; generation: number }
  /** 別の端末へ引き継がれていた。この端末は送信を止める */
  | { status: "handed_over"; handedOverAt: string }
  /** 今回は届かなかった。次の保存か次の起動で送り直す */
  | { status: "deferred" };

/**
 * 端末に保存できた直後に、まるごと1件を預ける。
 * 呼び出し側は結果を待たずに画面を進めてよい。
 */
export async function pushSnapshot(payloadText: string): Promise<PushResult> {
  if (!isCloudBackupEnabled()) return { status: "off" };
  // 同意していないあいだは1件も送らない。ログイン（アカウント作成）だけでは
  // アップロードを始めないため、送信の手前で必ずここを通す
  if (!hasCloudBackupConsent()) return { status: "off" };

  const state = readCloudSyncState();
  if (state.handedOverAt) {
    return { status: "handed_over", handedOverAt: state.handedOverAt };
  }

  let response: Response;
  try {
    response = await fetch(SNAPSHOT_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: state.deviceId,
        payloadText,
        checksum: await snapshotChecksum(payloadText),
      }),
    });
  } catch {
    // 通信断。画面には出さず、次の機会に送り直す
    return { status: "deferred" };
  }

  if (response.status === 401 || response.status === 404) {
    return { status: "off" };
  }

  if (response.status === 409) {
    const handedOverAt = await readHandedOverAt(response);
    if (!handedOverAt) return { status: "deferred" };
    writeCloudSyncState({ ...state, handedOverAt });
    return { status: "handed_over", handedOverAt };
  }

  if (!response.ok) return { status: "deferred" };

  try {
    const body = (await response.json()) as {
      storedAt?: unknown;
      generation?: unknown;
    };
    if (
      typeof body.storedAt !== "string" ||
      typeof body.generation !== "number"
    ) {
      return { status: "deferred" };
    }

    writeCloudSyncState({
      ...state,
      lastSyncedAt: body.storedAt,
      lastGeneration: body.generation,
      handedOverAt: null,
    });
    return {
      status: "synced",
      storedAt: body.storedAt,
      generation: body.generation,
    };
  } catch {
    return { status: "deferred" };
  }
}

async function readHandedOverAt(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as {
      reason?: unknown;
      claimedAt?: unknown;
    };
    if (body.reason !== "device_handed_over") return null;
    return typeof body.claimedAt === "string" ? body.claimedAt : null;
  } catch {
    return null;
  }
}

export type FetchResult =
  | { status: "off" }
  | { status: "empty" }
  | { status: "found"; payload: ExportPayload; storedAt: string }
  | { status: "unavailable" };

/**
 * クラウドの控えを取り出す。取り出した内容は端末内の取り込みと同じ検証を
 * 通してから返す。壊れていた場合は「無い」ではなく「取り出せない」とする。
 */
export async function fetchCloudSnapshot(): Promise<FetchResult> {
  if (!isCloudBackupEnabled()) return { status: "off" };

  let response: Response;
  try {
    response = await fetch(SNAPSHOT_URL, { method: "GET" });
  } catch {
    return { status: "unavailable" };
  }

  if (response.status === 401) return { status: "off" };
  if (response.status === 404) return { status: "empty" };
  if (!response.ok) return { status: "unavailable" };

  try {
    const body = (await response.json()) as {
      payloadText?: unknown;
      checksum?: unknown;
      storedAt?: unknown;
    };
    if (
      typeof body.payloadText !== "string" ||
      typeof body.checksum !== "string" ||
      typeof body.storedAt !== "string"
    ) {
      return { status: "unavailable" };
    }

    // 途中で欠けた控えを、そのまま端末へ書き戻さない
    if ((await snapshotChecksum(body.payloadText)) !== body.checksum) {
      return { status: "unavailable" };
    }

    const parsed = parseExportPayload(JSON.parse(body.payloadText) as unknown);
    if (!parsed.ok) return { status: "unavailable" };

    return { status: "found", payload: parsed.data, storedAt: body.storedAt };
  } catch {
    return { status: "unavailable" };
  }
}

/** 復元を終えた端末を、同期する1台として登録する */
export async function claimThisDevice(): Promise<boolean> {
  if (!isCloudBackupEnabled()) return false;

  const state = readCloudSyncState();
  try {
    const response = await fetch(DEVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: state.deviceId }),
    });
    if (!response.ok) return false;
  } catch {
    return false;
  }

  writeCloudSyncState({ ...state, handedOverAt: null });
  return true;
}

export type DeleteResult =
  /** 入口が閉じている */
  | "off"
  /** 消えた。何度呼んでも消えたものとして扱う */
  | "deleted"
  /** 本人確認から時間が経っている。もう一度ログインしてもらう */
  | "reauth_required"
  /** 今回は消せなかった。もう一度試せる */
  | "failed";

/**
 * クラウド上の本人データを消す。停止と退会の両方から呼ぶ。
 *
 * 取り返しのつかない操作なので、APIは直近の本人確認を求める。時間が
 * 経っていた場合は消さずに `reauth_required` を返し、画面はもう一度の
 * ログインを案内する。
 */
export async function deleteCloudData(): Promise<DeleteResult> {
  if (!isCloudBackupEnabled()) return "off";
  try {
    const response = await fetch(SNAPSHOT_URL, { method: "DELETE" });
    if (response.status === 204) return "deleted";
    if (response.status === 403) return "reauth_required";
    return "failed";
  } catch {
    return "failed";
  }
}

export type SnapshotSummary = {
  recordCount: number;
  selfCareCount: number;
  notToDoCount: number;
  /** 記録がある期間。1件もなければ null */
  firstDate: string | null;
  lastDate: string | null;
};

/** 件数と期間だけを取り出す。本文は取り出さない */
export function summarizePayload(payload: ExportPayload): SnapshotSummary {
  const dates = payload.records.map((record) => record.date).sort();
  return {
    recordCount: payload.records.length,
    selfCareCount: payload.selfCareItems.length,
    notToDoCount: payload.notToDoItems.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}

export type RestorePlan =
  /** クラウドにだけ記録がある。そのまま書き戻してよい */
  | { kind: "restore_cloud"; cloud: SnapshotSummary }
  /** 端末にだけ記録がある。書き戻すものがないので預けるだけ */
  | { kind: "upload_local"; local: SnapshotSummary }
  /** 両方にある。自動で混ぜず、本人に選んでもらう */
  | { kind: "choice_required"; local: SnapshotSummary; cloud: SnapshotSummary }
  /** どちらにも記録がない */
  | { kind: "nothing_to_do" };

/**
 * 復元のときに何を見せるかを決める。ここでは決して自動で選ばない。
 *
 * 端末とクラウドの両方に記録がある場合に自動で統合・置き換えをすると、
 * 間違ったときに本人が気づけないまま記録が消える。
 */
export function planRestore(
  local: ExportPayload,
  cloud: ExportPayload | null
): RestorePlan {
  const localSummary = summarizePayload(local);
  const hasLocal = localSummary.recordCount > 0;

  if (!cloud) {
    return hasLocal
      ? { kind: "upload_local", local: localSummary }
      : { kind: "nothing_to_do" };
  }

  const cloudSummary = summarizePayload(cloud);
  const hasCloud = cloudSummary.recordCount > 0;

  if (!hasLocal && !hasCloud) return { kind: "nothing_to_do" };
  if (!hasLocal) return { kind: "restore_cloud", cloud: cloudSummary };
  if (!hasCloud) return { kind: "upload_local", local: localSummary };

  return {
    kind: "choice_required",
    local: localSummary,
    cloud: cloudSummary,
  };
}

/**
 * 決める前にJSONバックアップの保存を求めるか。
 * どちらを選んでも片方が上書きされる場合だけ必須にする。
 */
export function requiresLocalBackup(plan: RestorePlan): boolean {
  return plan.kind === "choice_required";
}

/**
 * 記録を端末に保存できた直後に、まるごと1件を預け直す。
 *
 * 呼び出し側は結果を待たない。ここでの失敗は記録の保存の失敗ではないため、
 * 画面にはエラーを出さず、次の保存かアプリ起動のときに送り直す。
 */
export function backupAfterSave(): void {
  if (!isCloudBackupEnabled()) return;
  if (!hasCloudBackupConsent()) return;

  void (async () => {
    try {
      const payload = await repository.buildExportPayload();
      if (!payload.ok) return;
      await pushSnapshot(JSON.stringify(payload.value));
    } catch {
      // 送れなくても端末への保存は終わっている。静かに次の機会へ回す
    }
  })();
}
