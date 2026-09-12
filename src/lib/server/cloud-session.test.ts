import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const createNeonAuth = vi.hoisted(() => vi.fn(() => ({ getSession })));

vi.mock("@neondatabase/auth/next/server", () => ({ createNeonAuth }));

const { getCloudAuthStatus, getCloudSession, isRecentlyVerified } =
  await import("./cloud-session");
const { _resetNeonAuthCacheForTest } = await import("./neon-auth");

const OWNER_ID = "user_abc123";
const ALLOWED_EMAIL = "sanka@example.com";

const ENV_KEYS = [
  "VERCEL_ENV",
  "USER_DATA_DEV_OWNER_ID",
  "USER_DATA_ALLOWED_EMAILS",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
] as const;

type EnvSnapshot = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

function snapshotEnv(): EnvSnapshot {
  const snapshot: EnvSnapshot = {};
  for (const key of ENV_KEYS) snapshot[key] = process.env[key];
  return snapshot;
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function configureRealAuthEnv() {
  delete process.env.USER_DATA_DEV_OWNER_ID;
  delete process.env.VERCEL_ENV;
  process.env.NEON_AUTH_BASE_URL = "https://example-auth.neon.tech";
  process.env.NEON_AUTH_COOKIE_SECRET = "a".repeat(32);
  process.env.USER_DATA_ALLOWED_EMAILS = ALLOWED_EMAIL;
}

function validSession(overrides: Partial<{ expiresAt: string; createdAt: string; email: string; userId: string }> = {}) {
  return {
    data: {
      session: {
        id: "session_1",
        userId: overrides.userId ?? OWNER_ID,
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000).toISOString(),
        createdAt: overrides.createdAt ?? new Date().toISOString(),
      },
      user: {
        id: overrides.userId ?? OWNER_ID,
        email: overrides.email ?? ALLOWED_EMAIL,
      },
    },
    error: null,
  };
}

describe("cloud-session", () => {
  let envSnapshot: EnvSnapshot;

  beforeEach(() => {
    envSnapshot = snapshotEnv();
    vi.clearAllMocks();
    _resetNeonAuthCacheForTest();
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
    _resetNeonAuthCacheForTest();
  });

  describe("getCloudSession", () => {
    it("Cookieが無い場合はnullを返す", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });

    it("期限切れのセッションはnullを返す", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue(
        validSession({ expiresAt: new Date(Date.now() - 1_000).toISOString() })
      );

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });

    it("改ざんされたCookieなど上流の検証エラーはnullを返す", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue({
        data: null,
        error: { message: "invalid session", status: 401, statusText: "", code: "UNAUTHORIZED" },
      });

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });

    it("SDK呼び出し自体が例外を投げてもnullを返す", async () => {
      configureRealAuthEnv();
      getSession.mockRejectedValue(new Error("network error"));

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });

    it("検証済みでも許可リストに無いメールアドレスはnullを返す", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue(validSession({ email: "other@example.com" }));

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });

    it("許可リストが未設定なら誰も通さない", async () => {
      configureRealAuthEnv();
      delete process.env.USER_DATA_ALLOWED_EMAILS;
      getSession.mockResolvedValue(validSession());

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });

    it("検証に成功した場合だけownerIdを返す", async () => {
      configureRealAuthEnv();
      const createdAt = "2026-09-08T09:00:00.000Z";
      getSession.mockResolvedValue(validSession({ createdAt }));

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toEqual({
        ownerId: OWNER_ID,
        verifiedAt: new Date(createdAt),
      });
    });

    it("Managed Better Authの環境変数が未設定なら常にnullを返す", async () => {
      delete process.env.USER_DATA_DEV_OWNER_ID;
      delete process.env.VERCEL_ENV;
      delete process.env.NEON_AUTH_BASE_URL;
      delete process.env.NEON_AUTH_COOKIE_SECRET;

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
      expect(getSession).not.toHaveBeenCalled();
    });

    it("Preview用の抜け道はVERCEL_ENV=productionでは無視される", async () => {
      process.env.VERCEL_ENV = "production";
      process.env.USER_DATA_DEV_OWNER_ID = "preview-owner-1";
      delete process.env.NEON_AUTH_BASE_URL;
      delete process.env.NEON_AUTH_COOKIE_SECRET;

      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });
  });

  describe("getCloudAuthStatus", () => {
    it("Cookieが無い場合は unauthenticated を返す", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue({
        data: { session: null, user: null },
        error: null,
      });

      const status = await getCloudAuthStatus(
        new Request("https://yorucare.example")
      );
      expect(status).toEqual({ status: "unauthenticated" });
    });

    it("検証済みでも許可リストに無いメールアドレスは not_allowed を返す", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue(validSession({ email: "other@example.com" }));

      const status = await getCloudAuthStatus(
        new Request("https://yorucare.example")
      );
      expect(status).toEqual({ status: "not_allowed" });
    });

    it("許可リストが未設定なら not_allowed を返す", async () => {
      configureRealAuthEnv();
      delete process.env.USER_DATA_ALLOWED_EMAILS;
      getSession.mockResolvedValue(validSession());

      const status = await getCloudAuthStatus(
        new Request("https://yorucare.example")
      );
      expect(status).toEqual({ status: "not_allowed" });
    });

    it("期限切れのセッションは unauthenticated を返す（許可リストに載っていても）", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue(
        validSession({ expiresAt: new Date(Date.now() - 1_000).toISOString() })
      );

      const status = await getCloudAuthStatus(
        new Request("https://yorucare.example")
      );
      expect(status).toEqual({ status: "unauthenticated" });
    });

    it("検証に成功した場合だけ ok とownerIdを返す", async () => {
      configureRealAuthEnv();
      const createdAt = "2026-09-08T09:00:00.000Z";
      getSession.mockResolvedValue(validSession({ createdAt }));

      const status = await getCloudAuthStatus(
        new Request("https://yorucare.example")
      );
      expect(status).toEqual({
        status: "ok",
        session: { ownerId: OWNER_ID, verifiedAt: new Date(createdAt) },
      });
    });

    it("getCloudSession はこの関数のokだけをownerIdへ変換する", async () => {
      configureRealAuthEnv();
      getSession.mockResolvedValue(validSession({ email: "other@example.com" }));

      // not_allowed を getCloudSession 側から見ると null（既存の契約と同じ）
      const session = await getCloudSession(new Request("https://yorucare.example"));
      expect(session).toBeNull();
    });
  });

  describe("isRecentlyVerified", () => {
    const now = new Date("2026-09-08T12:10:00.000Z");

    it("10分以内ならtrue", () => {
      const session = { ownerId: OWNER_ID, verifiedAt: new Date("2026-09-08T12:00:00.000Z") };
      expect(isRecentlyVerified(session, now)).toBe(true);
    });

    it("ちょうど10分ならtrue", () => {
      const session = {
        ownerId: OWNER_ID,
        verifiedAt: new Date(now.getTime() - 10 * 60 * 1000),
      };
      expect(isRecentlyVerified(session, now)).toBe(true);
    });

    it("10分を1秒でも過ぎていればfalse", () => {
      const session = {
        ownerId: OWNER_ID,
        verifiedAt: new Date(now.getTime() - 10 * 60 * 1000 - 1_000),
      };
      expect(isRecentlyVerified(session, now)).toBe(false);
    });
  });
});
