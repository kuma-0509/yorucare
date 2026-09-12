// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { saveCloudBackupConsent } from "@/lib/cloud-consent";
import { writeCloudSyncState } from "@/lib/cloud-sync-state";
import { CloudBackupPanel } from "./cloud-backup-panel";

const CLOUD = COPY.cloudBackup;
const DEVICE_ID = "a".repeat(32);

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));
const sync = vi.hoisted(() => ({
  pushSnapshot: vi.fn(),
  deleteCloudData: vi.fn(),
}));
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cloud-auth-client", () => ({ cloudAuthClient: auth }));
vi.mock("@/lib/cloud-sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cloud-sync")>(
    "@/lib/cloud-sync"
  );
  return { ...actual, ...sync };
});
// 復元画面は別のテストで確かめる
vi.mock("./cloud-restore-dialog", () => ({
  CloudRestoreDialog: () => null,
}));

const payload = {
  version: 1 as const,
  exportedAt: "2026-09-08T12:00:00.000Z",
  returnDate: null,
  records: [
    { date: "2026-09-01" },
    { date: "2026-09-08" },
  ],
  selfCareItems: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
  notToDoItems: [{ id: "n1" }],
};

const repo = vi.hoisted(() => ({ buildExportPayload: vi.fn() }));
vi.mock("@/lib/repository", () => ({ repository: repo }));

/** 押したあと、非同期の処理が落ち着くまで待つ */
async function clickAsync(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * `GET /api/cloud/session`（`fetchCloudAuthOutcome`が叩く先）の応答を固定する。
 * この画面はBetter Authのセッション有無を自分で見ず、この結果だけを正とする。
 *
 * `auth.getSession`（Better Authクライアント）も一緒に設定しておく。こちらは
 * 現在の実装では読まないが、「Better Authのセッションはあるのに許可リスト外」
 * という状態（`notAllowed`）を正しく表すために必要（回帰確認で使う）。
 */
function signedIn() {
  auth.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
  fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
}

function signedOut() {
  auth.getSession.mockResolvedValue({ data: null });
  fetchMock.mockResolvedValue(
    jsonResponse(401, { ok: false, reason: "unauthenticated" })
  );
}

/** Better Authのセッションはあるが、許可リスト外のアドレス */
function notAllowed() {
  auth.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
  fetchMock.mockResolvedValue(
    jsonResponse(403, { ok: false, reason: "not_allowed" })
  );
}

describe("クラウド保存の設定", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = "true";
    // 本物の pushSnapshot は成功時に最終預け日時を端末へ書く。表示を確かめる
    // ためにそこだけ同じ動きにしておく
    sync.pushSnapshot.mockImplementation(async () => {
      writeCloudSyncState({
        deviceId: DEVICE_ID,
        lastSyncedAt: "2026-09-08T22:14:00.000Z",
        lastGeneration: 1,
        handedOverAt: null,
      });
      return {
        status: "synced",
        storedAt: "2026-09-08T22:14:00.000Z",
        generation: 1,
      };
    });
    sync.deleteCloudData.mockResolvedValue("deleted");
    repo.buildExportPayload.mockResolvedValue({ ok: true, value: payload });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED = originalFlag;
    }
  });

  it("入口が閉じているあいだは何も出さない", async () => {
    delete process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;
    signedIn();
    const { container } = render(<CloudBackupPanel />);
    await waitFor(() => expect(container.innerHTML).toBe(""));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  describe("ログインしていないとき", () => {
    beforeEach(signedOut);

    it("預ける前の説明とログインの導線を出す", async () => {
      render(<CloudBackupPanel />);
      expect(await screen.findByText(CLOUD.signInHeading)).toBeTruthy();
      for (const line of CLOUD.summary) {
        expect(screen.getByText(line)).toBeTruthy();
      }
      const link = screen.getByRole("link", { name: CLOUD.signInAction });
      expect(link.getAttribute("href")).toBe("/cloud-login");
    });

    it("保存場所・見られる人・消し方を詳細として示す", async () => {
      render(<CloudBackupPanel />);
      await screen.findByText(CLOUD.signInHeading);
      for (const item of CLOUD.details) {
        expect(screen.getByText(item.heading)).toBeTruthy();
      }
    });

    it("ログインの導線を出す時点では1件も送らない", async () => {
      render(<CloudBackupPanel />);
      await screen.findByText(CLOUD.signInHeading);
      expect(sync.pushSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("Better Authのセッションはあるが、許可リスト外のとき", () => {
    beforeEach(notAllowed);

    it("「ログイン済み」ではなく、使えない旨の専用案内を出す", async () => {
      render(<CloudBackupPanel />);
      expect(await screen.findByText(CLOUD.notAllowedHeading)).toBeTruthy();
      expect(screen.getByText(CLOUD.notAllowedBody)).toBeTruthy();
      // 「預ける前の説明」や件数確認など、使えるかのような表示は出さない
      expect(screen.queryByText(CLOUD.confirmHeading)).toBeNull();
      expect(screen.queryByText(CLOUD.enabledHeading)).toBeNull();
    });

    it("別のメールアドレスでログインし直す導線を出す", async () => {
      render(<CloudBackupPanel />);
      const link = await screen.findByRole("link", {
        name: CLOUD.notAllowedAction,
      });
      expect(link.getAttribute("href")).toBe("/cloud-login");
    });

    it("この時点では1件も送らない", async () => {
      render(<CloudBackupPanel />);
      await screen.findByText(CLOUD.notAllowedHeading);
      expect(sync.pushSnapshot).not.toHaveBeenCalled();
    });
  });

  describe("ログイン済みで、まだ預けていないとき", () => {
    beforeEach(signedIn);

    it("ログインしただけでは1件も送らない", async () => {
      render(<CloudBackupPanel />);
      await screen.findByText(CLOUD.confirmHeading);
      expect(sync.pushSnapshot).not.toHaveBeenCalled();
    });

    it("預ける直前に件数と期間を出す", async () => {
      render(<CloudBackupPanel />);
      expect(
        await screen.findByText(CLOUD.confirmCounts(2, 3, 1))
      ).toBeTruthy();
      expect(screen.getByText(CLOUD.confirmPeriod("9/1", "9/8"))).toBeTruthy();
    });

    it("記録が無い端末でも、クラウドから戻す導線を出す", async () => {
      repo.buildExportPayload.mockResolvedValue({
        ok: true,
        value: { ...payload, records: [] },
      });
      render(<CloudBackupPanel />);

      expect(
        await screen.findByRole("button", { name: CLOUD.restoreAction })
      ).toBeTruthy();
      // 預けるものが無いので、預ける方は押せないままにする
      const upload = screen.getByRole("button", {
        name: CLOUD.confirmAction,
      }) as HTMLButtonElement;
      expect(upload.disabled).toBe(true);
    });

    it("記録の中身は画面に出さない", async () => {
      render(<CloudBackupPanel />);
      await screen.findByText(CLOUD.confirmHeading);
      expect(document.body.textContent).not.toContain("2026-09-01");
    });

    it("本人が押したときにだけ預け、最終預け日時を出す", async () => {
      render(<CloudBackupPanel />);

      await clickAsync(
        await screen.findByRole("button", { name: CLOUD.confirmAction })
      );

      expect(sync.pushSnapshot).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByText(CLOUD.lastSyncedAt("9月8日 22:14"))
      ).toBeTruthy();
    });

    it("預けられなかったときは「預けている」と見せない", async () => {
      sync.pushSnapshot.mockResolvedValue({ status: "deferred" });
      render(<CloudBackupPanel />);

      await clickAsync(
        await screen.findByRole("button", { name: CLOUD.confirmAction })
      );

      expect((await screen.findAllByText(CLOUD.uploadFailed)).length).toBeGreaterThan(0);
      expect(screen.queryByText(CLOUD.enabledHeading)).toBeNull();
    });
  });

  describe("預けているとき", () => {
    beforeEach(() => {
      signedIn();
      saveCloudBackupConsent(true);
    });

    it("最後に預けた日時を出す", async () => {
      writeCloudSyncState({
        deviceId: DEVICE_ID,
        lastSyncedAt: "2026-09-08T22:14:00.000Z",
        lastGeneration: 1,
        handedOverAt: null,
      });
      render(<CloudBackupPanel />);
      expect(
        await screen.findByText(CLOUD.lastSyncedAt("9月8日 22:14"))
      ).toBeTruthy();
    });

    it("何日も預けられていないときだけ、責めない言い方で知らせる", async () => {
      const stale = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000);
      writeCloudSyncState({
        deviceId: DEVICE_ID,
        lastSyncedAt: stale.toISOString(),
        lastGeneration: 1,
        handedOverAt: null,
      });
      render(<CloudBackupPanel />);
      expect(await screen.findByText(CLOUD.staleNotice(9))).toBeTruthy();
    });

    it("預けたばかりなら知らせない", async () => {
      writeCloudSyncState({
        deviceId: DEVICE_ID,
        lastSyncedAt: new Date().toISOString(),
        lastGeneration: 1,
        handedOverAt: null,
      });
      render(<CloudBackupPanel />);
      await screen.findByText(CLOUD.enabledHeading);
      expect(screen.queryByText(/預けられていません/)).toBeNull();
    });

    describe("別の端末へ引き継がれたとき", () => {
      beforeEach(() => {
        writeCloudSyncState({
          deviceId: DEVICE_ID,
          lastSyncedAt: "2026-09-01T22:14:00.000Z",
          lastGeneration: 1,
          handedOverAt: "2026-09-03T09:00:00.000Z",
        });
      });

      it("引き継いだ日付と、記録が消えていないことを示す", async () => {
        render(<CloudBackupPanel />);
        expect(
          await screen.findByText(CLOUD.handedOverBody("9月3日"))
        ).toBeTruthy();
        expect(screen.getByText(CLOUD.handedOverKept)).toBeTruthy();
      });

      it("同期端末へ戻す方法を示す", async () => {
        render(<CloudBackupPanel />);
        expect(
          await screen.findByText(CLOUD.handedOverReturn)
        ).toBeTruthy();
        expect(
          screen.getByRole("button", { name: CLOUD.handedOverAction })
        ).toBeTruthy();
      });
    });

    describe("停止と退会", () => {
      beforeEach(() => {
        writeCloudSyncState({
          deviceId: DEVICE_ID,
          lastSyncedAt: "2026-09-08T22:14:00.000Z",
          lastGeneration: 1,
          handedOverAt: null,
        });
      });

      it("確かめてから消す。押しただけでは消さない", async () => {
        render(<CloudBackupPanel />);

        await clickAsync(
          await screen.findByRole("button", { name: CLOUD.stopAction })
        );
        expect(sync.deleteCloudData).not.toHaveBeenCalled();

        await clickAsync(
          screen.getByRole("button", { name: CLOUD.stopConfirmAction })
        );
        expect(sync.deleteCloudData).toHaveBeenCalledTimes(1);
        expect((await screen.findAllByText(CLOUD.stopDone)).length).toBeGreaterThan(0);
      });

      it("退会ではログインからも出る", async () => {
        auth.signOut.mockResolvedValue({ data: {}, error: null });
        render(<CloudBackupPanel />);

        await clickAsync(
          await screen.findByRole("button", { name: CLOUD.leaveAction })
        );
        await clickAsync(
          screen.getByRole("button", { name: CLOUD.leaveConfirmAction })
        );

        expect(sync.deleteCloudData).toHaveBeenCalledTimes(1);
        expect(auth.signOut).toHaveBeenCalledTimes(1);
        expect((await screen.findAllByText(CLOUD.leaveDone)).length).toBeGreaterThan(0);
      });

      it("サーバーがログアウトのエラーを返したときは、ログインから出た表示にしない", async () => {
        auth.signOut.mockResolvedValue({
          data: null,
          error: { message: "Invalid origin", status: 403, code: "INVALID_ORIGIN" },
        });
        render(<CloudBackupPanel />);

        await clickAsync(
          await screen.findByRole("button", { name: CLOUD.leaveAction })
        );
        await clickAsync(
          screen.getByRole("button", { name: CLOUD.leaveConfirmAction })
        );

        // クラウド上の控えはすでに消えている
        expect(sync.deleteCloudData).toHaveBeenCalledTimes(1);
        expect(
          (await screen.findAllByText(CLOUD.leaveSignOutFailed)).length
        ).toBeGreaterThan(0);
        // 「ログインから出た」表示（未ログイン扱い）へは切り替えない
        expect(screen.queryByText(CLOUD.leaveDone)).toBeNull();
        expect(screen.queryByText(CLOUD.signInHeading)).toBeNull();
      });

      it("例外が起きたときも、ログインから出た表示にしない", async () => {
        auth.signOut.mockRejectedValue(new TypeError("network error"));
        render(<CloudBackupPanel />);

        await clickAsync(
          await screen.findByRole("button", { name: CLOUD.leaveAction })
        );
        await clickAsync(
          screen.getByRole("button", { name: CLOUD.leaveConfirmAction })
        );

        expect(sync.deleteCloudData).toHaveBeenCalledTimes(1);
        expect(
          (await screen.findAllByText(CLOUD.leaveSignOutFailed)).length
        ).toBeGreaterThan(0);
        expect(screen.queryByText(CLOUD.signInHeading)).toBeNull();
      });

      it("本人確認から時間が経っていたら、消さずに再ログインを案内する", async () => {
        sync.deleteCloudData.mockResolvedValue("reauth_required");
        render(<CloudBackupPanel />);

        await clickAsync(
          await screen.findByRole("button", { name: CLOUD.stopAction })
        );
        await clickAsync(
          screen.getByRole("button", { name: CLOUD.stopConfirmAction })
        );

        expect((await screen.findAllByText(CLOUD.reauthRequired)).length).toBeGreaterThan(0);
        const link = screen.getByRole("link", { name: CLOUD.reauthAction });
        expect(link.getAttribute("href")).toBe("/cloud-login");
      });
    });
  });
});
