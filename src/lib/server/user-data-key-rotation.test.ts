import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  currentUserDataKeyVersion,
  encryptSnapshot,
  rewrapDataKey,
} from "./user-data-crypto";
import {
  assertRotationRole,
  formatRewrapReport,
  planSnapshotKeyRewrap,
  summarizeRewrapPlan,
} from "./user-data-key-rotation";

const KEY_V1 = randomBytes(32).toString("base64");
const KEY_V2 = randomBytes(32).toString("base64");
const OWNER_ID = "owner-secret-xyz";
const aad = { ownerId: OWNER_ID, schemaVersion: 4, generation: 1 };
const plaintext = JSON.stringify({
  version: 1,
  records: [{ date: "2026-09-08", note: "dummy-note" }],
});

describe("user-data-key-rotation", () => {
  const original = process.env.USER_DATA_KEK;

  beforeEach(() => {
    process.env.USER_DATA_KEK = `v1:${KEY_V1}`;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.USER_DATA_KEK;
    else process.env.USER_DATA_KEK = original;
  });

  it("現行版の行は包み直さない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    const plan = planSnapshotKeyRewrap(
      [{ ownerId: OWNER_ID, generation: 1, snapshot: sealed }],
      currentUserDataKeyVersion()
    );
    const report = summarizeRewrapPlan(plan);

    expect(report).toEqual({
      currentVersion: "v1",
      total: 1,
      skip: 1,
      update: 0,
      fail: 0,
    });
    expect(plan.decisions).toEqual([{ action: "skip" }]);
  });

  it("入れ替え中は旧版の行だけ包み直し、本文の暗号文は変えない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    process.env.USER_DATA_KEK = `v2:${KEY_V2},v1:${KEY_V1}`;

    const plan = planSnapshotKeyRewrap(
      [{ ownerId: OWNER_ID, generation: 1, snapshot: sealed }],
      currentUserDataKeyVersion()
    );
    const report = summarizeRewrapPlan(plan);
    const update = plan.decisions[0];

    expect(report).toMatchObject({
      currentVersion: "v2",
      skip: 0,
      update: 1,
      fail: 0,
    });
    expect(update.action).toBe("update");
    if (update.action !== "update") return;
    expect(update.snapshot.keyVersion).toBe("v2");
    expect(update.snapshot.ciphertext).toBe(sealed.ciphertext);
    expect(update.snapshot.wrappedDek).not.toBe(sealed.wrappedDek);
  });

  it("環に無い版の行は失敗として数え、書き込み対象に入れない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    process.env.USER_DATA_KEK = `v2:${KEY_V2}`;

    const plan = planSnapshotKeyRewrap(
      [{ ownerId: OWNER_ID, generation: 1, snapshot: sealed }],
      currentUserDataKeyVersion(),
      rewrapDataKey
    );
    const report = summarizeRewrapPlan(plan);

    expect(report.fail).toBe(1);
    expect(report.update).toBe(0);
    expect(plan.decisions).toEqual([{ action: "fail", reason: "unknown_version" }]);
  });

  it("要約文に所有者ID・暗号文・包んだ鍵を出さない", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    process.env.USER_DATA_KEK = `v2:${KEY_V2},v1:${KEY_V1}`;
    const plan = planSnapshotKeyRewrap(
      [{ ownerId: OWNER_ID, generation: 1, snapshot: sealed }],
      currentUserDataKeyVersion()
    );
    const text = formatRewrapReport(summarizeRewrapPlan(plan), "dry-run");

    expect(text).toContain("確認だけ");
    expect(text).toContain("現行の版: v2");
    expect(text).toContain("包み直し: 1件");
    expect(text).not.toContain(OWNER_ID);
    expect(text).not.toContain(sealed.ciphertext);
    expect(text).not.toContain(sealed.wrappedDek);
    expect(text).not.toContain("dummy-note");
  });

  it("失敗があるときは旧版を外してはいけないと書く", () => {
    const sealed = encryptSnapshot(plaintext, aad);
    process.env.USER_DATA_KEK = `v2:${KEY_V2}`;
    const plan = planSnapshotKeyRewrap(
      [{ ownerId: OWNER_ID, generation: 1, snapshot: sealed }],
      currentUserDataKeyVersion()
    );
    const text = formatRewrapReport(summarizeRewrapPlan(plan), "dry-run");

    expect(text).toContain("失敗: 1件。旧版を環境変数から外してはいけない。");
  });

  it("RLSを素通りできないロールでは作業を止める", () => {
    expect(() => assertRotationRole({ bypassRls: false })).toThrow(
      /RLSを素通りできない/
    );
    expect(() => assertRotationRole({ bypassRls: true })).not.toThrow();
  });
});
