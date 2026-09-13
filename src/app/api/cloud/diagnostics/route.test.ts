import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getCloudAuthStatus = vi.hoisted(() => vi.fn());

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
  return new Request(`${ORIGIN}/api/cloud/diagnostics`, {
    method: "GET",
    headers: { Origin: ORIGIN, ...headers },
  });
}

const ENV_KEYS = [
  "NEXT_PUBLIC_CLOUD_BACKUP_ENABLED",
  "VERCEL_ENV",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_REF",
  "USER_DATA_ALLOWED_EMAILS",
  "USER_DATA_DEV_OWNER_ID",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
] as const;

type EnvSnapshot = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

describe("/api/cloud/diagnostics", () => {
  let snapshot: EnvSnapshot;
  const fetchMock = vi.fn();

  beforeEach(() => {
    snapshot = {};
    for (const key of ENV_KEYS) snapshot[key] = process.env[key];
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
    process.env.VERCEL_GIT_COMMIT_REF = "claude/example";
    process.env.USER_DATA_ALLOWED_EMAILS = "a@example.com, b@example.com";
    delete process.env.USER_DATA_DEV_OWNER_ID;
    process.env.NEON_AUTH_BASE_URL = "https://auth.example.neon.tech";
    process.env.NEON_AUTH_COOKIE_SECRET = "x".repeat(40);

    getCloudAuthStatus.mockResolvedValue({ status: "unauthenticated" });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) {
      const value = snapshot[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("本番では存在しない扱いにする", async () => {
    process.env.VERCEL_ENV = "production";
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(getCloudAuthStatus).not.toHaveBeenCalled();
  });

  it("入口が閉じているときも存在しない扱いにする", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    expect((await GET(request())).status).toBe(404);
  });

  it("別オリジンからの要求を断る", async () => {
    const response = await GET(request({ Origin: "https://example.com" }));
    expect(response.status).toBe(403);
  });

  it("どのデプロイ・どの設定で動いているかを返す（秘密は返さない）", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      vercelEnv: "preview",
      origin: ORIGIN,
      commit: "abcdef1",
      branch: "claude/example",
      allowedEmailCount: 2,
      devOwnerConfigured: false,
      authBaseUrlConfigured: true,
      authBaseUrlValid: true,
      authBaseHost: "auth.example.neon.tech",
      cookieSecretConfigured: true,
      session: "unauthenticated",
      devOwnerInUse: false,
      upstream: { reachable: true, status: 200 },
    });

    // メールアドレスそのものや、鍵・URL全体は返さない
    const text = JSON.stringify(body);
    expect(text).not.toContain("a@example.com");
    expect(text).not.toContain("x".repeat(40));
    expect(text).not.toContain("https://auth.example.neon.tech");
  });

  it("許可リストが空なら0件と答える", async () => {
    process.env.USER_DATA_ALLOWED_EMAILS = "";
    const body = await (await GET(request())).json();
    expect(body.allowedEmailCount).toBe(0);
  });

  it("上流へ届かないときは、その符号を返す", async () => {
    const error = Object.assign(new TypeError("fetch failed"), {
      code: "ENOTFOUND",
    });
    fetchMock.mockRejectedValue(error);

    const body = await (await GET(request())).json();
    expect(body.upstream).toEqual({ reachable: false, code: "ENOTFOUND" });
  });

  it("認証基盤のURLの形が壊れていたら、そう答える（上流も叩かない）", async () => {
    process.env.NEON_AUTH_BASE_URL = "これはURLではない";

    const body = await (await GET(request())).json();
    expect(body.authBaseUrlValid).toBe(false);
    expect(body.authBaseHost).toBeNull();
    expect(body.upstream).toEqual({ reachable: false, code: "INVALID_BASE_URL" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("固定IDで通っているときは、その旨を返す", async () => {
    process.env.USER_DATA_DEV_OWNER_ID = "preview-owner-1";
    getCloudAuthStatus.mockResolvedValue({
      status: "ok",
      session: { ownerId: "preview-owner-1", verifiedAt: new Date() },
      devOwner: true,
    });

    const body = await (await GET(request())).json();
    expect(body.devOwnerConfigured).toBe(true);
    expect(body.devOwnerInUse).toBe(true);
  });

  it("キャッシュさせない", async () => {
    const response = await GET(request());
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
