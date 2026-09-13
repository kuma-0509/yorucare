import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeAuthError,
  fetchCloudAuthOutcome,
  fetchCloudAuthState,
  hintForSignOutError,
} from "./cloud-auth-status";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchCloudAuthState", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("200なら ok を返し、印が無ければ devOwner は偽", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));

    await expect(fetchCloudAuthState()).resolves.toEqual({
      outcome: "ok",
      devOwner: false,
    });
  });

  it("200で devOwner の印があれば、そのまま伝える", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ok: true, devOwner: true }));

    await expect(fetchCloudAuthState()).resolves.toEqual({
      outcome: "ok",
      devOwner: true,
    });
  });

  it("200の本文が読めなくても ok の判定は変えない", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 200 }));

    await expect(fetchCloudAuthState()).resolves.toEqual({
      outcome: "ok",
      devOwner: false,
    });
  });

  it("401は unauthenticated", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { ok: false, reason: "unauthenticated" }));

    await expect(fetchCloudAuthState()).resolves.toEqual({
      outcome: "unauthenticated",
      devOwner: false,
    });
  });

  it("403 not_allowed は not_allowed", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(403, { ok: false, reason: "not_allowed" }));

    await expect(fetchCloudAuthState()).resolves.toEqual({
      outcome: "not_allowed",
      devOwner: false,
    });
  });

  it("通信できないときは unknown（未認証と区別する）", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("network error"));

    await expect(fetchCloudAuthState()).resolves.toEqual({
      outcome: "unknown",
      devOwner: false,
    });
  });

  it("fetchCloudAuthOutcome は状態だけを取り出す", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ok: true, devOwner: true }));

    await expect(fetchCloudAuthOutcome()).resolves.toBe("ok");
  });
});

describe("describeAuthError", () => {
  it("状態番号と符号を短く添える", () => {
    expect(
      describeAuthError({ message: "Invalid origin", status: 403, code: "INVALID_ORIGIN" })
    ).toBe("（詳細: 403 INVALID_ORIGIN）");
  });

  it("符号が無ければ statusText を使う", () => {
    expect(describeAuthError({ status: 401, statusText: "Unauthorized" })).toBe(
      "（詳細: 401 Unauthorized）"
    );
  });

  it("手がかりが無いときは何も足さない", () => {
    expect(describeAuthError(new TypeError("network error"))).toBe("");
    expect(describeAuthError(null)).toBe("");
    expect(describeAuthError("failed")).toBe("");
  });

  it("長い符号は切り詰める（画面をエラー文で埋めない）", () => {
    const long = "E".repeat(80);
    const described = describeAuthError({ status: 500, code: long });
    expect(described).toBe(`（詳細: 500 ${"E".repeat(40)}）`);
  });
});

describe("hintForSignOutError", () => {
  it("403のときだけ、Domains未登録の可能性を案内する", () => {
    // SDKは403をすべて feature_not_supported に置き換えるため、符号からは
    // 原因が分からない。この案件で実際に起きた403はDomains未登録だった
    expect(
      hintForSignOutError({ status: 403, code: "feature_not_supported" })
    ).toContain("Domains");
  });

  it("403以外には何も足さない", () => {
    expect(hintForSignOutError({ status: 401 })).toBe("");
    expect(hintForSignOutError({ status: 500 })).toBe("");
    expect(hintForSignOutError(new TypeError("network error"))).toBe("");
    expect(hintForSignOutError(null)).toBe("");
  });
});
