import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_NOT_ALLOWED_CODE } from "@/lib/cloud-login-errors";

const getNeonAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/neon-auth", () => ({ getNeonAuth }));

const { GET, POST } = await import("./route");

const ORIGIN = "https://yorucare.example";

const ALLOWED_EMAIL = "sanka@example.com";

function request(method: "GET" | "POST"): Request {
  return new Request(`${ORIGIN}/api/auth/get-session`, { method });
}

function otpRequest(email: string): Request {
  return new Request(`${ORIGIN}/api/auth/email-otp/send-verification-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type: "sign-in" }),
  });
}

function context() {
  return { params: Promise.resolve({ path: ["get-session"] }) };
}

function otpContext() {
  return {
    params: Promise.resolve({ path: ["email-otp", "send-verification-otp"] }),
  };
}

describe("/api/auth/[...path]", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
  const originalAllowed = process.env.USER_DATA_ALLOWED_EMAILS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.USER_DATA_ALLOWED_EMAILS = ALLOWED_EMAIL;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
    }
    if (originalAllowed === undefined) {
      delete process.env.USER_DATA_ALLOWED_EMAILS;
    } else {
      process.env.USER_DATA_ALLOWED_EMAILS = originalAllowed;
    }
  });

  it("入口が閉じているときは存在しない扱いにする", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

    expect((await GET(request("GET"), context())).status).toBe(404);
    expect((await POST(request("POST"), context())).status).toBe(404);
    expect(getNeonAuth).not.toHaveBeenCalled();
  });

  it("Managed Better Authが未設定のときも存在しない扱いにする", async () => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    getNeonAuth.mockReturnValue(null);

    expect((await GET(request("GET"), context())).status).toBe(404);
  });

  it("設定済みならManaged Better Authのハンドラーへ渡す", async () => {
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    const handlerGet = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    getNeonAuth.mockReturnValue({
      handler: () => ({ GET: handlerGet, POST: vi.fn() }),
    });

    const req = request("GET");
    const ctx = context();
    const response = await GET(req, ctx);

    expect(response.status).toBe(200);
    expect(handlerGet).toHaveBeenCalledWith(req, ctx);
  });

  describe("許可リストの照合", () => {
    function handlerPostMock() {
      const handlerPost = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 200 }));
      getNeonAuth.mockReturnValue({
        handler: () => ({ GET: vi.fn(), POST: handlerPost }),
      });
      return handlerPost;
    }

    beforeEach(() => {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    });

    it("一覧に無いメールアドレスにはコードを送らせない", async () => {
      const handlerPost = handlerPostMock();

      const response = await POST(
        otpRequest("shiranai@example.com"),
        otpContext()
      );

      expect(response.status).toBe(403);
      expect(handlerPost).not.toHaveBeenCalled();
      await expect(response.json()).resolves.toEqual({
        ok: false,
        code: EMAIL_NOT_ALLOWED_CODE,
        message: EMAIL_NOT_ALLOWED_CODE,
      });
    });

    it("一覧が未設定なら誰にも送らせない", async () => {
      delete process.env.USER_DATA_ALLOWED_EMAILS;
      const handlerPost = handlerPostMock();

      const response = await POST(otpRequest(ALLOWED_EMAIL), otpContext());
      expect(response.status).toBe(403);
      expect(handlerPost).not.toHaveBeenCalled();
      await expect(response.json()).resolves.toEqual({
        ok: false,
        code: EMAIL_NOT_ALLOWED_CODE,
        message: EMAIL_NOT_ALLOWED_CODE,
      });
    });

    it("大文字や前後の空白が違っても同じものとして扱う", async () => {
      const handlerPost = handlerPostMock();

      const response = await POST(
        otpRequest("  SANKA@Example.com  "),
        otpContext()
      );

      expect(response.status).toBe(200);
      expect(handlerPost).toHaveBeenCalledTimes(1);
    });

    it("一覧にあるメールアドレスは本文を保ったまま転送する", async () => {
      const handlerPost = handlerPostMock();

      const response = await POST(otpRequest(ALLOWED_EMAIL), otpContext());

      expect(response.status).toBe(200);
      expect(handlerPost).toHaveBeenCalledTimes(1);
      const forwarded = handlerPost.mock.calls[0][0] as Request;
      await expect(forwarded.json()).resolves.toEqual({
        email: ALLOWED_EMAIL,
        type: "sign-in",
      });
    });

    it("メールアドレスを含まない要求（サインアウト等）はそのまま通す", async () => {
      const handlerPost = handlerPostMock();

      const response = await POST(
        new Request(`${ORIGIN}/api/auth/sign-out`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ path: ["sign-out"] }) }
      );

      expect(response.status).toBe(200);
      expect(handlerPost).toHaveBeenCalledTimes(1);
    });
  });
});
