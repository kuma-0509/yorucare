import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCloudAuthStatus = vi.hoisted(() => vi.fn());

// 実SDKはNext.jsのサーバー専用APIを読み込むため、境界で差し替える
vi.mock("@neondatabase/auth/next/server", () => ({
  createNeonAuth: vi.fn(() => ({ getSession: vi.fn() })),
}));

vi.mock("@/lib/server/cloud-session", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/cloud-session")
  >("@/lib/server/cloud-session");
  return { ...actual, getCloudAuthStatus };
});

const { GET } = await import("./route");

const ORIGIN = "https://yorucare.example";

function request(headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/cloud/session`, {
    method: "GET",
    headers: { Origin: ORIGIN, ...headers },
  });
}

describe("/api/cloud/session", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
    }
  });

  it("入口が閉じていれば存在しない扱いにする", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    expect((await GET(request())).status).toBe(404);
    expect(getCloudAuthStatus).not.toHaveBeenCalled();
  });

  it("別オリジンからの要求を断る", async () => {
    getCloudAuthStatus.mockResolvedValue({ status: "ok", session: {} });
    const response = await GET(request({ Origin: "https://example.com" }));
    expect(response.status).toBe(403);
    expect(getCloudAuthStatus).not.toHaveBeenCalled();
  });

  it("許可された利用者は200を返す", async () => {
    getCloudAuthStatus.mockResolvedValue({
      status: "ok",
      session: { ownerId: "owner-1", verifiedAt: new Date() },
    });
    const response = await GET(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("Better Authのセッションはあるが許可リスト外なら403 not_allowedを返す", async () => {
    getCloudAuthStatus.mockResolvedValue({ status: "not_allowed" });
    const response = await GET(request());
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: "not_allowed",
    });
  });

  it("未認証なら401 unauthenticatedを返す", async () => {
    getCloudAuthStatus.mockResolvedValue({ status: "unauthenticated" });
    const response = await GET(request());
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
  });

  it("キャッシュさせない", async () => {
    getCloudAuthStatus.mockResolvedValue({ status: "unauthenticated" });
    const response = await GET(request());
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
