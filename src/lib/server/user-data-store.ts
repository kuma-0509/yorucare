import {
  neon,
  type NeonQueryFunction,
  type NeonQueryFunctionInTransaction,
} from "@neondatabase/serverless";
import { SNAPSHOT_GENERATIONS_KEPT } from "@/lib/cloud-backup";
import {
  decryptSnapshot,
  encryptSnapshot,
  isUserDataKeyConfigured,
  type EncryptedSnapshot,
} from "./user-data-crypto";

/**
 * 本人記録のクラウドバックアップを読み書きする唯一の場所。
 *
 * 匿名利用イベント用の接続文字列は読まない。データ境界を分けるため、
 * 別プロジェクト・別ロールの USER_DATA_DATABASE_URL だけを使う。
 *
 * 平文で持つのは所有者ID、世代、件数、スキーマ版、時刻だけ。記録の中身は
 * すべて暗号文の中にある。運営者が本人記録を一覧・検索する経路は作らない。
 */

let cachedConnection:
  | { databaseUrl: string; sql: NeonQueryFunction<false, false> }
  | undefined;

export class UserDataStoreUnavailableError extends Error {
  constructor() {
    super("User data store is not configured.");
    this.name = "UserDataStoreUnavailableError";
  }
}

/** 同じ所有者へ2か所から同時に書き込もうとしたとき */
export class UserDataConflictError extends Error {
  constructor() {
    super("User data snapshot generation conflict.");
    this.name = "UserDataConflictError";
  }
}

export type StoredSnapshot = {
  generation: number;
  schemaVersion: number;
  recordCount: number;
  storedAt: string;
  payloadText: string;
};

export type ActiveDevice = {
  activeDeviceId: string;
  claimedAt: string;
};

function getSql(): NeonQueryFunction<false, false> {
  const databaseUrl = process.env.USER_DATA_DATABASE_URL ?? "";
  if (!databaseUrl || !isUserDataKeyConfigured()) {
    throw new UserDataStoreUnavailableError();
  }

  if (!cachedConnection || cachedConnection.databaseUrl !== databaseUrl) {
    cachedConnection = { databaseUrl, sql: neon(databaseUrl) };
  }
  return cachedConnection.sql;
}

/** 本人記録の保存先が使える状態か。使えなければAPIは 503 を返す */
export function isUserDataStoreConfigured(): boolean {
  try {
    getSql();
    return true;
  } catch {
    return false;
  }
}

/**
 * RLSが所有者を判断するための値を、同じトランザクション内だけへ設定する。
 * APIで確認した所有者IDと、DBが見る所有者IDを必ず同じにする。
 */
function scopeToOwner(
  transaction: NeonQueryFunctionInTransaction<false, false>,
  ownerId: string
) {
  return transaction`SELECT set_config('app.owner_id', ${ownerId}, true)`;
}

type SnapshotRow = {
  generation: string | number;
  schema_version: number;
  record_count: number;
  algorithm: string;
  key_version: string;
  wrapped_dek: string;
  nonce: string;
  ciphertext: string;
  created_at: string;
};

/**
 * 現在の同期端末を返す。まだ1台も登録されていなければ null。
 */
export async function getActiveDevice(
  ownerId: string
): Promise<ActiveDevice | null> {
  const sql = getSql();
  const [, rows] = (await sql.transaction((transaction) => [
    scopeToOwner(transaction, ownerId),
    transaction`
      SELECT active_device_id, claimed_at
      FROM user_data_devices
      WHERE owner_id = ${ownerId}
    `,
  ])) as [unknown, Array<{ active_device_id: string; claimed_at: string }>];

  const row = rows[0];
  if (!row) return null;
  return {
    activeDeviceId: row.active_device_id,
    claimedAt: new Date(row.claimed_at).toISOString(),
  };
}

/**
 * この端末を同期端末として登録する。すでに別の端末が登録されていれば
 * 置き換える。以前の端末は次の送信で 409 を受け取り、停止状態になる。
 */
export async function claimDevice(
  ownerId: string,
  deviceId: string
): Promise<ActiveDevice> {
  const sql = getSql();
  const [, rows] = (await sql.transaction((transaction) => [
    scopeToOwner(transaction, ownerId),
    transaction`
      INSERT INTO user_data_devices (owner_id, active_device_id, claimed_at)
      VALUES (${ownerId}, ${deviceId}, now())
      ON CONFLICT (owner_id) DO UPDATE SET
        active_device_id = EXCLUDED.active_device_id,
        claimed_at = EXCLUDED.claimed_at
      RETURNING active_device_id, claimed_at
    `,
  ])) as [unknown, Array<{ active_device_id: string; claimed_at: string }>];

  const row = rows[0];
  return {
    activeDeviceId: row.active_device_id,
    claimedAt: new Date(row.claimed_at).toISOString(),
  };
}

/**
 * スナップショットを1件保存し、古い世代を落とす。
 *
 * 世代番号はAADにも入れるため、採番してから暗号化する。採番と保存の間に
 * 別の端末が割り込んだ場合は主キーで弾かれ、黙って上書きされることはない。
 */
export async function saveSnapshot(input: {
  ownerId: string;
  payloadText: string;
  schemaVersion: number;
  recordCount: number;
}): Promise<{ generation: number; storedAt: string }> {
  const sql = getSql();

  const [, latestRows] = (await sql.transaction((transaction) => [
    scopeToOwner(transaction, input.ownerId),
    transaction`
      SELECT COALESCE(MAX(generation), 0) AS latest
      FROM user_data_snapshots
      WHERE owner_id = ${input.ownerId}
    `,
  ])) as [unknown, Array<{ latest: string | number }>];

  const generation = Number(latestRows[0]?.latest ?? 0) + 1;
  const sealed = encryptSnapshot(input.payloadText, {
    ownerId: input.ownerId,
    schemaVersion: input.schemaVersion,
    generation,
  });

  let rows: Array<{ created_at: string }>;
  try {
    const result = (await sql.transaction((transaction) => [
      scopeToOwner(transaction, input.ownerId),
      transaction`
        INSERT INTO user_data_snapshots (
          owner_id,
          generation,
          schema_version,
          record_count,
          algorithm,
          key_version,
          wrapped_dek,
          nonce,
          ciphertext
        )
        VALUES (
          ${input.ownerId},
          ${generation},
          ${input.schemaVersion},
          ${input.recordCount},
          ${sealed.algorithm},
          ${sealed.keyVersion},
          ${sealed.wrappedDek},
          ${sealed.nonce},
          ${sealed.ciphertext}
        )
        RETURNING created_at
      `,
      transaction`
        DELETE FROM user_data_snapshots
        WHERE owner_id = ${input.ownerId}
          AND generation <= ${generation - SNAPSHOT_GENERATIONS_KEPT}
      `,
    ])) as [unknown, Array<{ created_at: string }>, unknown];
    rows = result[1];
  } catch (error) {
    if (isUniqueViolation(error)) throw new UserDataConflictError();
    throw error;
  }

  return {
    generation,
    storedAt: new Date(rows[0].created_at).toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

/**
 * 最新のスナップショットを返す。まだ1件も預けていなければ null。
 *
 * 最新が復号できない場合は、1つ前の世代へ順に下がる。上書き保存で
 * 壊れた内容が唯一の控えになる事態を避けるために世代を残している。
 */
export async function getLatestSnapshot(
  ownerId: string
): Promise<StoredSnapshot | null> {
  const sql = getSql();
  const [, rows] = (await sql.transaction((transaction) => [
    scopeToOwner(transaction, ownerId),
    transaction`
      SELECT
        generation,
        schema_version,
        record_count,
        algorithm,
        key_version,
        wrapped_dek,
        nonce,
        ciphertext,
        created_at
      FROM user_data_snapshots
      WHERE owner_id = ${ownerId}
      ORDER BY generation DESC
      LIMIT ${SNAPSHOT_GENERATIONS_KEPT}
    `,
  ])) as [unknown, SnapshotRow[]];

  for (const row of rows) {
    const generation = Number(row.generation);
    const sealed: EncryptedSnapshot = {
      algorithm: row.algorithm,
      keyVersion: row.key_version,
      wrappedDek: row.wrapped_dek,
      nonce: row.nonce,
      ciphertext: row.ciphertext,
    };

    try {
      return {
        generation,
        schemaVersion: row.schema_version,
        recordCount: row.record_count,
        storedAt: new Date(row.created_at).toISOString(),
        payloadText: decryptSnapshot(sealed, {
          ownerId,
          schemaVersion: row.schema_version,
          generation,
        }),
      };
    } catch {
      // 復号できない世代は飛ばして、1つ前の控えを試す
      continue;
    }
  }

  return null;
}

/**
 * クラウド上の本人データをすべて消す。クラウド停止と退会の両方で使う。
 * 何度実行しても成功として扱う。
 */
export async function deleteAllUserData(ownerId: string): Promise<void> {
  const sql = getSql();
  await sql.transaction((transaction) => [
    scopeToOwner(transaction, ownerId),
    transaction`DELETE FROM user_data_snapshots WHERE owner_id = ${ownerId}`,
    transaction`DELETE FROM user_data_devices WHERE owner_id = ${ownerId}`,
  ]);
}
