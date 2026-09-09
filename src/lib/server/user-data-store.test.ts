import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transaction = vi.hoisted(() => vi.fn());

vi.mock("@neondatabase/serverless", () => ({
  neon: () => ({ transaction }),
}));

const { getLatestSnapshot, UserDataUnreadableError } = await import(
  "./user-data-store"
);
const { encryptSnapshot } = await import("./user-data-crypto");

const OWNER_ID = "owner-1";
const SCHEMA_VERSION = 4;
const KEY = randomBytes(32).toString("base64");

function rowFor(generation: number, payloadText: string) {
  const sealed = encryptSnapshot(payloadText, {
    ownerId: OWNER_ID,
    schemaVersion: SCHEMA_VERSION,
    generation,
  });
  return {
    generation,
    schema_version: SCHEMA_VERSION,
    record_count: 1,
    algorithm: sealed.algorithm,
    key_version: sealed.keyVersion,
    wrapped_dek: sealed.wrappedDek,
    nonce: sealed.nonce,
    ciphertext: sealed.ciphertext,
    created_at: "2026-09-08T12:00:00.000Z",
  };
}

describe("user-data-store の取り出し", () => {
  const original = {
    url: process.env.USER_DATA_DATABASE_URL,
    kek: process.env.USER_DATA_KEK,
  };

  beforeEach(() => {
    transaction.mockReset();
    process.env.USER_DATA_DATABASE_URL = "postgresql://user:pass@host/db";
    process.env.USER_DATA_KEK = `v1:${KEY}`;
  });

  afterEach(() => {
    for (const [key, value] of [
      ["USER_DATA_DATABASE_URL", original.url],
      ["USER_DATA_KEK", original.kek],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("1件も預けていなければ null を返す", async () => {
    transaction.mockResolvedValue([null, []]);
    await expect(getLatestSnapshot(OWNER_ID)).resolves.toBeNull();
  });

  it("最新の世代を復号して返す", async () => {
    const payloadText = JSON.stringify({ version: 1, records: [] });
    transaction.mockResolvedValue([null, [rowFor(3, payloadText)]]);

    const snapshot = await getLatestSnapshot(OWNER_ID);
    expect(snapshot).toMatchObject({ generation: 3, payloadText });
  });

  it("最新が壊れていれば1つ前の世代へ下がる", async () => {
    const payloadText = JSON.stringify({ version: 1, records: [] });
    const broken = rowFor(3, payloadText);
    broken.ciphertext = randomBytes(64).toString("base64");
    transaction.mockResolvedValue([null, [broken, rowFor(2, payloadText)]]);

    const snapshot = await getLatestSnapshot(OWNER_ID);
    expect(snapshot).toMatchObject({ generation: 2, payloadText });
  });

  it("控えは残っているのに1つも復号できないとき、空と取り違えない", async () => {
    const payloadText = JSON.stringify({ version: 1, records: [] });
    const rows = [rowFor(3, payloadText), rowFor(2, payloadText)];
    // 鍵を入れ替え損ねた状態を作る
    process.env.USER_DATA_KEK = `v1:${randomBytes(32).toString("base64")}`;
    transaction.mockResolvedValue([null, rows]);

    await expect(getLatestSnapshot(OWNER_ID)).rejects.toBeInstanceOf(
      UserDataUnreadableError
    );
  });
});
