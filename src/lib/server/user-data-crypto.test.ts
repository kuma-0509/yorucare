import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checksumMatches,
  decryptSnapshot,
  encryptSnapshot,
  isUserDataKeyConfigured,
  rewrapDataKey,
  UserDataDecryptionError,
  UserDataKeyUnavailableError,
  type EncryptedSnapshot,
} from "./user-data-crypto";

const KEY_V1 = randomBytes(32).toString("base64");
const KEY_V2 = randomBytes(32).toString("base64");

const aad = { ownerId: "owner-1", schemaVersion: 4, generation: 1 };
const plaintext = JSON.stringify({
  version: 1,
  records: [{ date: "2026-09-08", note: "しんどかったが眠れた" }],
});

describe("user-data-crypto", () => {
  const original = process.env.USER_DATA_KEK;

  beforeEach(() => {
    process.env.USER_DATA_KEK = `v1:${KEY_V1}`;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.USER_DATA_KEK;
    else process.env.USER_DATA_KEK = original;
  });

  it("親鍵が未設定なら暗号化しない", () => {
    delete process.env.USER_DATA_KEK;
    expect(isUserDataKeyConfigured()).toBe(false);
    expect(() => encryptSnapshot(plaintext, aad)).toThrow(
      UserDataKeyUnavailableError
    );
  });

  it("長さの違う親鍵を受け付けない", () => {
    process.env.USER_DATA_KEK = `v1:${randomBytes(16).toString("base64")}`;
    expect(isUserDataKeyConfigured()).toBe(false);
  });

  it("暗号化して復号すると元のJSONへ戻る", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    expect(sealed.keyVersion).toBe("v1");
    expect(sealed.ciphertext).not.toContain("しんどかった");
    expect(decryptSnapshot(sealed, aad)).toBe(plaintext);
  });

  it("同じ内容でも毎回違う暗号文になる", () => {
    const first = encryptSnapshot(plaintext, aad);
    const second = encryptSnapshot(plaintext, aad);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.wrappedDek).not.toBe(second.wrappedDek);
  });

  it("圧縮しているため長い記録でも元のJSONより短くなる", () => {
    const long = JSON.stringify({
      records: Array.from({ length: 200 }, (_, index) => ({
        date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
        note: "きょうは休んだ",
      })),
    });
    const sealed = encryptSnapshot(long, aad);
    expect(Buffer.from(sealed.ciphertext, "base64").byteLength).toBeLessThan(
      Buffer.byteLength(long, "utf8")
    );
  });

  it("別の利用者のAADでは復号できない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    expect(() =>
      decryptSnapshot(sealed, { ...aad, ownerId: "owner-2" })
    ).toThrow(UserDataDecryptionError);
  });

  it("別の世代のAADでは復号できない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    expect(() => decryptSnapshot(sealed, { ...aad, generation: 2 })).toThrow(
      UserDataDecryptionError
    );
  });

  it("暗号文を改ざんすると復号できない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    const raw = Buffer.from(sealed.ciphertext, "base64");
    raw[raw.byteLength - 1] ^= 0xff;
    expect(() =>
      decryptSnapshot({ ...sealed, ciphertext: raw.toString("base64") }, aad)
    ).toThrow(UserDataDecryptionError);
  });

  it("nonceを改ざんすると復号できない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    const raw = Buffer.from(sealed.nonce, "base64");
    raw[0] ^= 0xff;
    expect(() =>
      decryptSnapshot({ ...sealed, nonce: raw.toString("base64") }, aad)
    ).toThrow(UserDataDecryptionError);
  });

  it("長さの合わないnonceでも例外を漏らさない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    expect(() => decryptSnapshot({ ...sealed, nonce: "" }, aad)).toThrow(
      UserDataDecryptionError
    );
  });

  it("nonceを列として別に持つ", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    expect(Buffer.from(sealed.nonce, "base64").byteLength).toBe(12);
  });

  it("包んだ鍵を改ざんすると復号できない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    const raw = Buffer.from(sealed.wrappedDek, "base64");
    raw[raw.byteLength - 1] ^= 0xff;
    expect(() =>
      decryptSnapshot({ ...sealed, wrappedDek: raw.toString("base64") }, aad)
    ).toThrow(UserDataDecryptionError);
  });

  it("別の親鍵では復号できない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    process.env.USER_DATA_KEK = `v1:${KEY_V2}`;
    expect(() => decryptSnapshot(sealed, aad)).toThrow(UserDataDecryptionError);
  });

  it("知らないアルゴリズム名の行は復号しない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    expect(() =>
      decryptSnapshot({ ...sealed, algorithm: "aes-128-gcm" }, aad)
    ).toThrow(UserDataDecryptionError);
  });

  describe("親鍵の入れ替え", () => {
    let sealedWithV1: EncryptedSnapshot;

    beforeEach(() => {
      sealedWithV1 = encryptSnapshot(plaintext, aad);
      // 新しい版を先頭に、旧版を後ろに置いた状態が入れ替え中
      process.env.USER_DATA_KEK = `v2:${KEY_V2},v1:${KEY_V1}`;
    });

    it("入れ替え中は旧版の暗号文も復号できる", () => {
      expect(decryptSnapshot(sealedWithV1, aad)).toBe(plaintext);
    });

    it("新しく保存する分は新しい版で包まれる", () => {
      expect(encryptSnapshot(plaintext, aad).keyVersion).toBe("v2");
    });

    it("記録本体を触らずに鍵だけ包み直せる", () => {
      const rewrapped = rewrapDataKey(sealedWithV1);
      expect(rewrapped.keyVersion).toBe("v2");
      expect(rewrapped.ciphertext).toBe(sealedWithV1.ciphertext);
      expect(decryptSnapshot(rewrapped, aad)).toBe(plaintext);
    });

    it("包み直し済みの行は何度呼んでも変わらない", () => {
      const once = rewrapDataKey(sealedWithV1);
      expect(rewrapDataKey(once)).toBe(once);
    });

    it("旧版を外した後は包み直せた行だけが復号できる", () => {
      const rewrapped = rewrapDataKey(sealedWithV1);
      process.env.USER_DATA_KEK = `v2:${KEY_V2}`;
      expect(decryptSnapshot(rewrapped, aad)).toBe(plaintext);
      expect(() => decryptSnapshot(sealedWithV1, aad)).toThrow(
        UserDataDecryptionError
      );
    });
  });

  describe("checksumMatches", () => {
    it("同じ値なら真", () => {
      expect(checksumMatches("abc123", "abc123")).toBe(true);
    });

    it("違う値なら偽", () => {
      expect(checksumMatches("abc123", "abc124")).toBe(false);
    });

    it("長さが違っても例外にせず偽を返す", () => {
      expect(checksumMatches("abc", "abcdef")).toBe(false);
    });
  });
});
