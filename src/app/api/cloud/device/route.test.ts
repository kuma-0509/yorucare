import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserDataStoreUnavailableError } from "@/lib/server/user-data-store";

const getCloudSession = vi.hoisted(() => vi.fn());
const store = vi.hoisted(() => ({
  claimDevice: vi.fn(),
  getActiveDevice: vi.fn(),
}));

vi.mock("@/lib/server/cloud-session", () => ({ getCloudSession }));
vi.mock("@/lib/server/user-data-store", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/user-data-store")
  >("@/lib/server/user-data-store");
  return { ...actual, ...store };
});

const { GET, POST } = await import("./route");

const DEVICE_ID = "c".repeat(32);
const ORIGIN = "https://yorucare.example";

function request(
  method: "GET" | "POST",
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(`${ORIGIN}/api/cloud/device`, {
    method,
    headers: {
      Origin: ORIGIN,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/cloud/device", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    getCloudSession.mockResolvedValue({
      ownerId: "owner-1",
      verifiedAt: new Date(),
    });
    store.claimDevice.mockResolvedValue({
      activeDeviceId: DEVICE_ID,
      claimedAt: "2026-09-08T12:00:00.000Z",
    });
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
    expect((await POST(request("POST", { deviceId: DEVICE_ID }))).status).toBe(
      404
    );
    expect(store.claimDevice).not.toHaveBeenCalled();
  });

  it("未認証なら登録しない", async () => {
    getCloudSession.mockResolvedValue(null);
    expect((await POST(request("POST", { deviceId: DEVICE_ID }))).status).toBe(
      401
    );
    expect(store.claimDevice).not.toHaveBeenCalled();
  });

  it("別オリジンからの要求を断る", async () => {
    const response = await POST(
      request("POST", { deviceId: DEVICE_ID }, { Origin: "https://example.com" })
    );
    expect(response.status).toBe(403);
  });

  it("形式外の端末識別子は受け付けない", async () => {
    expect((await POST(request("POST", { deviceId: "xyz" }))).status).toBe(400);
  });

  it("所有者はセッションからだけ決める", async () => {
    await POST(request("POST", { deviceId: DEVICE_ID, ownerId: "owner-2" }));
    expect(store.claimDevice).toHaveBeenCalledWith("owner-1", DEVICE_ID);
  });

  it("復元した端末を同期端末として登録する", async () => {
    const response = await POST(request("POST", { deviceId: DEVICE_ID }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      activeDeviceId: DEVICE_ID,
    });
  });

  it("まだ1台も登録がなければ404を返す", async () => {
    store.getActiveDevice.mockResolvedValue(null);
    expect((await GET(request("GET"))).status).toBe(404);
  });

  it("現在の同期端末を返す", async () => {
    store.getActiveDevice.mockResolvedValue({
      activeDeviceId: DEVICE_ID,
      claimedAt: "2026-09-08T12:00:00.000Z",
    });
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      activeDeviceId: DEVICE_ID,
    });
  });

  it("保存先が未設定なら503を返す", async () => {
    store.claimDevice.mockRejectedValue(new UserDataStoreUnavailableError());
    expect((await POST(request("POST", { deviceId: DEVICE_ID }))).status).toBe(
      503
    );
  });
});
