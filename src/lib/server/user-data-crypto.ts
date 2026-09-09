import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

/**
 * 本人記録のスナップショットを暗号化する。
 *
 * 利用者ごとにデータ暗号鍵（DEK）を1本作り、記録本体はDEKで暗号化する。
 * DEKは親鍵（KEK）で包んでDBへ保存する。DBに平文の鍵は置かない。
 *
 * 鍵の取得と包み直しはこのファイルだけが行う。将来AWS KMSへ移す場合も、
 * loadKeyRing と wrapDataKey / unwrapDataKey を差し替えれば済むようにしている。
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export class UserDataKeyUnavailableError extends Error {
  constructor(message = "User data encryption key is not configured.") {
    super(message);
    this.name = "UserDataKeyUnavailableError";
  }
}

export class UserDataDecryptionError extends Error {
  constructor(message = "User data could not be decrypted.") {
    super(message);
    this.name = "UserDataDecryptionError";
  }
}

export type SnapshotAad = {
  ownerId: string;
  schemaVersion: number;
  generation: number;
};

export type EncryptedSnapshot = {
  algorithm: string;
  keyVersion: string;
  wrappedDek: string;
  nonce: string;
  ciphertext: string;
};

type KeyRing = {
  /** 包み直しに使う現行の親鍵 */
  current: { version: string; key: Buffer };
  /** 版ごとの親鍵。入れ替え中は旧版でも復号できる必要がある */
  byVersion: Map<string, Buffer>;
};

let cachedKeyRing: { raw: string; ring: KeyRing } | undefined;

/**
 * USER_DATA_KEK は `版:base64鍵` をカンマで並べた文字列。
 * 先頭が現行の版で、以降は入れ替え中に復号だけへ使う旧版。
 * 例: `v2:BASE64...,v1:BASE64...`
 */
function loadKeyRing(): KeyRing {
  const raw = process.env.USER_DATA_KEK ?? "";
  if (!raw.trim()) throw new UserDataKeyUnavailableError();
  if (cachedKeyRing?.raw === raw) return cachedKeyRing.ring;

  const byVersion = new Map<string, Buffer>();
  let current: KeyRing["current"] | undefined;

  for (const entry of raw.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      throw new UserDataKeyUnavailableError(
        "USER_DATA_KEK は `版:base64鍵` の形式で指定してください。"
      );
    }

    const version = trimmed.slice(0, separator);
    const key = Buffer.from(trimmed.slice(separator + 1), "base64");
    if (key.byteLength !== KEY_BYTES) {
      throw new UserDataKeyUnavailableError(
        "USER_DATA_KEK の鍵は base64 で 32 バイトにしてください。"
      );
    }
    if (byVersion.has(version)) {
      throw new UserDataKeyUnavailableError(
        "USER_DATA_KEK に同じ版が2つあります。"
      );
    }

    byVersion.set(version, key);
    current ??= { version, key };
  }

  if (!current) throw new UserDataKeyUnavailableError();

  const ring: KeyRing = { current, byVersion };
  cachedKeyRing = { raw, ring };
  return ring;
}

/** 親鍵が設定済みかどうか。設定されていなければAPIは動かさない */
export function isUserDataKeyConfigured(): boolean {
  try {
    loadKeyRing();
    return true;
  } catch {
    return false;
  }
}

/**
 * 暗号文に結び付ける付加データ。所有者・スキーマ版・世代を含めることで、
 * 別の利用者や別の世代の暗号文を持ち込んでも復号できないようにする。
 */
function buildAad(aad: SnapshotAad): Buffer {
  return Buffer.from(
    JSON.stringify({
      t: "yorucare-user-data",
      o: aad.ownerId,
      s: aad.schemaVersion,
      g: aad.generation,
    }),
    "utf8"
  );
}

type SealedParts = { nonce: Buffer; payload: Buffer };

function seal(key: Buffer, plaintext: Buffer, aad: Buffer): SealedParts {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  cipher.setAAD(aad);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { nonce, payload: Buffer.concat([cipher.getAuthTag(), body]) };
}

function open(
  key: Buffer,
  { nonce, payload }: SealedParts,
  aad: Buffer
): Buffer {
  if (nonce.byteLength !== NONCE_BYTES || payload.byteLength < AUTH_TAG_BYTES) {
    throw new UserDataDecryptionError();
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(payload.subarray(0, AUTH_TAG_BYTES));
    return Buffer.concat([
      decipher.update(payload.subarray(AUTH_TAG_BYTES)),
      decipher.final(),
    ]);
  } catch {
    // 鍵違い、AAD改ざん、nonce改ざん、暗号文改ざんを区別せずに扱う。
    // どこが合わなかったかを返すと、総当たりの手掛かりになる。
    throw new UserDataDecryptionError();
  }
}

/**
 * 包んだDEKは列を分けずに1つの文字列へまとめる。
 * 記録本体と違い、nonceを別々に持っても運用上の使い道がない。
 */
function sealToString(key: Buffer, plaintext: Buffer, aad: Buffer): string {
  const { nonce, payload } = seal(key, plaintext, aad);
  return Buffer.concat([nonce, payload]).toString("base64");
}

function openFromString(key: Buffer, sealed: string, aad: Buffer): Buffer {
  const raw = Buffer.from(sealed, "base64");
  if (raw.byteLength < NONCE_BYTES) throw new UserDataDecryptionError();
  return open(
    key,
    { nonce: raw.subarray(0, NONCE_BYTES), payload: raw.subarray(NONCE_BYTES) },
    aad
  );
}

const WRAP_AAD = Buffer.from("yorucare-user-data-dek", "utf8");

/**
 * スナップショットを圧縮し、利用者ごとの新しいDEKで暗号化する。
 * DEKは現行版の親鍵で包み、暗号文と一緒に返す。
 */
export function encryptSnapshot(
  plaintextJson: string,
  aad: SnapshotAad
): EncryptedSnapshot {
  const ring = loadKeyRing();
  const dek = randomBytes(KEY_BYTES);

  try {
    const compressed = gzipSync(Buffer.from(plaintextJson, "utf8"));
    const sealed = seal(dek, compressed, buildAad(aad));
    return {
      algorithm: ALGORITHM,
      keyVersion: ring.current.version,
      wrappedDek: sealToString(ring.current.key, dek, WRAP_AAD),
      nonce: sealed.nonce.toString("base64"),
      ciphertext: sealed.payload.toString("base64"),
    };
  } finally {
    // 平文のDEKを1リクエストより長く残さない
    dek.fill(0);
  }
}

/** 保存済みのスナップショットを復号して元のJSON文字列へ戻す */
export function decryptSnapshot(
  snapshot: EncryptedSnapshot,
  aad: SnapshotAad
): string {
  const ring = loadKeyRing();

  if (snapshot.algorithm !== ALGORITHM) {
    throw new UserDataDecryptionError();
  }

  const kek = ring.byVersion.get(snapshot.keyVersion);
  if (!kek) {
    // 入れ替えで旧版を外した後に古い暗号文が残っていた場合。
    // 復号できないことを、鍵が無いこととして扱う。
    throw new UserDataDecryptionError();
  }

  const dek = openFromString(kek, snapshot.wrappedDek, WRAP_AAD);
  try {
    if (dek.byteLength !== KEY_BYTES) throw new UserDataDecryptionError();
    const opened = open(
      dek,
      {
        nonce: Buffer.from(snapshot.nonce, "base64"),
        payload: Buffer.from(snapshot.ciphertext, "base64"),
      },
      buildAad(aad)
    );
    return gunzipSync(opened).toString("utf8");
  } catch (error) {
    if (error instanceof UserDataDecryptionError) throw error;
    throw new UserDataDecryptionError();
  } finally {
    dek.fill(0);
  }
}

/**
 * 親鍵の入れ替え時に、暗号文を作り直さずDEKだけを現行版で包み直す。
 * 記録本体を復号しないため、入れ替え作業で本文を触らずに済む。
 */
export function rewrapDataKey(snapshot: EncryptedSnapshot): EncryptedSnapshot {
  const ring = loadKeyRing();
  if (snapshot.keyVersion === ring.current.version) return snapshot;

  const kek = ring.byVersion.get(snapshot.keyVersion);
  if (!kek) throw new UserDataDecryptionError();

  const dek = openFromString(kek, snapshot.wrappedDek, WRAP_AAD);
  try {
    return {
      ...snapshot,
      keyVersion: ring.current.version,
      wrappedDek: sealToString(ring.current.key, dek, WRAP_AAD),
    };
  } finally {
    dek.fill(0);
  }
}

/** 端末が送ってきたチェックサムの照合。長さが違う場合も含めて一定時間で比べる */
export function checksumMatches(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}
