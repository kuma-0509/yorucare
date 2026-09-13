import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeDiagnostics,
  fetchCloudDiagnostics,
  type CloudDiagnostics,
} from "./cloud-diagnostics";

const BASE: CloudDiagnostics = {
  vercelEnv: "preview",
  origin: "https://yorucare.example",
  commit: "abcdef1",
  branch: "claude/example",
  cloudBackupEnabled: true,
  allowedEmailCount: 1,
  devOwnerConfigured: false,
  authBaseUrlConfigured: true,
  authBaseUrlValid: true,
  authBaseHost: "auth.example.neon.tech",
  cookieSecretConfigured: true,
  session: "ok",
  devOwnerInUse: false,
  upstream: { reachable: true, status: 200 },
};

describe("fetchCloudDiagnostics", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("本番のように404が返るときは何も出さない（nullを返す）", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await expect(fetchCloudDiagnostics()).resolves.toBeNull();
  });

  it("通信できないときもnullを返す", async () => {
    fetchMock.mockRejectedValue(new TypeError("network error"));
    await expect(fetchCloudDiagnostics()).resolves.toBeNull();
  });

  it("200なら中身をそのまま返す", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(BASE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(fetchCloudDiagnostics()).resolves.toEqual(BASE);
  });
});

describe("describeDiagnostics", () => {
  function valueOf(diagnostics: CloudDiagnostics, label: string): string {
    const row = describeDiagnostics(diagnostics).find((r) => r.label === label);
    return row?.value ?? "";
  }

  it("Domainsへ登録すべきURLを、そのままの形で出す", () => {
    expect(valueOf(BASE, "この画面のURL")).toBe("https://yorucare.example");
  });

  it("いま動いているコミットとブランチを並べる", () => {
    expect(valueOf(BASE, "いま動いているコミット")).toBe(
      "abcdef1（claude/example）"
    );
  });

  it("許可リストの件数を出す（中身は出さない）", () => {
    expect(valueOf({ ...BASE, allowedEmailCount: 0 }, "許可リストの件数")).toBe(
      "0件"
    );
  });

  it("固定IDが効いているかどうかを区別して出す", () => {
    expect(valueOf(BASE, "検証用の固定ID")).toBe("設定なし");
    expect(
      valueOf({ ...BASE, devOwnerConfigured: true }, "検証用の固定ID")
    ).toBe("設定あり（いまは使っていない）");
    expect(
      valueOf(
        { ...BASE, devOwnerConfigured: true, devOwnerInUse: true },
        "検証用の固定ID"
      )
    ).toBe("設定あり（いまこれで通っている）");
  });

  it("上流へ届かないときは符号まで出す", () => {
    expect(
      valueOf(
        { ...BASE, upstream: { reachable: false, code: "ENOTFOUND" } },
        "認証基盤"
      )
    ).toBe("auth.example.neon.tech / 届かない（ENOTFOUND）");
  });

  it("URLの形が壊れているときは、そう出す", () => {
    expect(
      valueOf(
        { ...BASE, authBaseUrlValid: false, authBaseHost: null },
        "認証基盤"
      )
    ).toBe("URLの形が不正");
  });
});
