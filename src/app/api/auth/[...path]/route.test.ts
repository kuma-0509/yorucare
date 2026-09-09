import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getNeonAuth = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/neon-auth", () => ({ getNeonAuth }));

const { GET, POST } = await import("./route");

const ORIGIN = "https://yorucare.example";

function request(method: "GET" | "POST"): Request {
  return new Request(`${ORIGIN}/api/auth/get-session`, { method });
}

function context() {
  return { params: Promise.resolve({ path: ["get-session"] }) };
}

describe("/api/auth/[...path]", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
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
});
