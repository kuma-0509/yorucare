import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapshotChecksum } from "@/lib/cloud-backup";
import { UserDataStoreUnavailableError } from "@/lib/server/user-data-store";

const getCloudSession = vi.hoisted(() => vi.fn());
const store = vi.hoisted(() => ({
  getActiveDevice: vi.fn(),
  getLatestSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  deleteAllUserData: vi.fn(),
}));

// 削除前の再認証の判定（`cloud-reauth.ts`）はここで置き換えない。テスト用の
// 置き換えでAPIの守りが消えないよう、判定は本物のまま通す
vi.mock("@/lib/server/cloud-session", () => ({ getCloudSession }));
vi.mock("@/lib/server/user-data-store", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/server/user-data-store")
  >("@/lib/server/user-data-store");
  return { ...actual, ...store };
});

const { DELETE, GET, PUT } = await import("./route");

const DEVICE_ID = "a".repeat(32);
const OTHER_DEVICE_ID = "b".repeat(32);
const ORIGIN = "https://yorucare.example";

const payload = {
  version: 1,
  exportedAt: "2026-09-08T12:00:00.000Z",
  returnDate: null,
  records: [],
  selfCareItems: [],
  notToDoItems: [],
};

async function uploadBody(overrides: Record<string, unknown> = {}) {
  const payloadText = JSON.stringify(payload);
  return {
    deviceId: DEVICE_ID,
    payloadText,
    checksum: await snapshotChecksum(payloadText),
    ...overrides,
  };
}

function request(
  method: "GET" | "PUT" | "DELETE",
  body?: unknown,
  headers: Record<string, string> = {}
): Request {
  return new Request(`${ORIGIN}/api/cloud/snapshot`, {
    method,
    headers: {
      Origin: ORIGIN,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/cloud/snapshot", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    getCloudSession.mockResolvedValue({
      ownerId: "owner-1",
      verifiedAt: new Date(),
    });
    store.getActiveDevice.mockResolvedValue(null);
    store.saveSnapshot.mockResolvedValue({
      generation: 1,
      storedAt: "2026-09-08T12:00:01.000Z",
    });
    store.deleteAllUserData.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
    }
  });

  describe("入口が閉じているとき", () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    });

    it("既定では存在しない扱いにする", async () => {
      expect((await GET(request("GET"))).status).toBe(404);
      expect((await PUT(request("PUT", await uploadBody()))).status).toBe(404);
      expect((await DELETE(request("DELETE"))).status).toBe(404);
    });

    it("入口が閉じている間はDBへ触らない", async () => {
      await PUT(request("PUT", await uploadBody()));
      expect(store.saveSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("未認証のとき", () => {
    beforeEach(() => {
      getCloudSession.mockResolvedValue(null);
    });

    it("読み書き削除のいずれも401で断る", async () => {
      expect((await GET(request("GET"))).status).toBe(401);
      expect((await PUT(request("PUT", await uploadBody()))).status).toBe(401);
      expect((await DELETE(request("DELETE"))).status).toBe(401);
    });

    it("未認証のときはDBへ触らない", async () => {
      await PUT(request("PUT", await uploadBody()));
      await DELETE(request("DELETE"));
      expect(store.saveSnapshot).not.toHaveBeenCalled();
      expect(store.deleteAllUserData).not.toHaveBeenCalled();
    });
  });

  it("別オリジンからの要求を断る", async () => {
    const response = await PUT(
      request("PUT", await uploadBody(), { Origin: "https://example.com" })
    );
    expect(response.status).toBe(403);
  });

  it("所有者IDは本文から指定できず、セッションの値だけを使う", async () => {
    await PUT(
      request("PUT", {
        ...(await uploadBody()),
        ownerId: "owner-2",
        owner_id: "owner-2",
      })
    );

    expect(store.saveSnapshot).toHaveBeenCalledTimes(1);
    expect(store.saveSnapshot.mock.calls[0][0].ownerId).toBe("owner-1");
  });

  it("預けた内容と照合が合わないと保存しない", async () => {
    const response = await PUT(
      request("PUT", await uploadBody({ checksum: "0".repeat(64) }))
    );
    expect(response.status).toBe(422);
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });

  it("端末内の取り込みと同じ検証を通らない内容は保存しない", async () => {
    const payloadText = JSON.stringify({ version: 99, records: "こわれた" });
    const response = await PUT(
      request("PUT", {
        deviceId: DEVICE_ID,
        payloadText,
        checksum: await snapshotChecksum(payloadText),
      })
    );
    expect(response.status).toBe(422);
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });

  it("JSONとして読めない本文は保存しない", async () => {
    const payloadText = "{ではない";
    const response = await PUT(
      request("PUT", {
        deviceId: DEVICE_ID,
        payloadText,
        checksum: await snapshotChecksum(payloadText),
      })
    );
    expect(response.status).toBe(400);
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });

  it("端末の識別子が形式外なら受け付けない", async () => {
    const response = await PUT(
      request("PUT", await uploadBody({ deviceId: "short" }))
    );
    expect(response.status).toBe(400);
  });

  it("上限を超える大きさは受け取らない", async () => {
    const response = await PUT(
      request("PUT", await uploadBody(), {
        "Content-Length": String(10_000_000),
      })
    );
    expect(response.status).toBe(413);
  });

  it("JSON以外の形式は受け取らない", async () => {
    const response = await PUT(
      request("PUT", await uploadBody(), { "Content-Type": "text/plain" })
    );
    expect(response.status).toBe(415);
  });

  it("初めての端末はそのまま預けられる", async () => {
    const response = await PUT(request("PUT", await uploadBody()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      generation: 1,
      recordCount: 0,
    });
  });

  it("別の端末へ引き継がれた後は上書きせず、引き継いだ日を返す", async () => {
    store.getActiveDevice.mockResolvedValue({
      activeDeviceId: OTHER_DEVICE_ID,
      claimedAt: "2026-09-07T00:00:00.000Z",
    });

    const response = await PUT(request("PUT", await uploadBody()));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      reason: "device_handed_over",
      claimedAt: "2026-09-07T00:00:00.000Z",
    });
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });

  it("預けたものと同じ本文を返す", async () => {
    const payloadText = JSON.stringify(payload);
    store.getLatestSnapshot.mockResolvedValue({
      generation: 3,
      schemaVersion: 4,
      recordCount: 0,
      storedAt: "2026-09-08T12:00:01.000Z",
      payloadText,
    });

    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      generation: 3,
      payloadText,
      checksum: await snapshotChecksum(payloadText),
    });
  });

  it("まだ何も預けていなければ404を返す", async () => {
    store.getLatestSnapshot.mockResolvedValue(null);
    expect((await GET(request("GET"))).status).toBe(404);
  });

  it("削除は204で返し、何度呼んでも成功として扱う", async () => {
    expect((await DELETE(request("DELETE"))).status).toBe(204);
    expect((await DELETE(request("DELETE"))).status).toBe(204);
    expect(store.deleteAllUserData).toHaveBeenCalledTimes(2);
  });

  describe("削除の前の再認証", () => {
    beforeEach(() => {
      getCloudSession.mockResolvedValue({
        ownerId: "owner-1",
        // 本人確認から十分に時間が経っている状態
        verifiedAt: new Date(Date.now() - 60 * 60 * 1000),
      });
    });

    it("本人確認から時間が経っていたら消さずに断る", async () => {
      const response = await DELETE(request("DELETE"));
      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        reason: "reauth_required",
      });
      expect(store.deleteAllUserData).not.toHaveBeenCalled();
    });

    it("断るときも読み書きは従来どおり続けられる", async () => {
      store.getLatestSnapshot.mockResolvedValue(null);
      expect((await GET(request("GET"))).status).toBe(404);
      expect((await PUT(request("PUT", await uploadBody()))).status).toBe(200);
    });
  });

  it("保存先が未設定なら503を返す", async () => {
    store.saveSnapshot.mockRejectedValue(new UserDataStoreUnavailableError());
    const response = await PUT(request("PUT", await uploadBody()));
    expect(response.status).toBe(503);
  });

  it("保存に失敗しても中身を返さない", async () => {
    store.saveSnapshot.mockRejectedValue(
      new Error("connection to owner-1 failed: しんどかった")
    );
    const response = await PUT(request("PUT", await uploadBody()));
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe("");
  });
});
