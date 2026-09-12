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

function signedIn() {
  auth.getSession.mockResolvedValue({ data: { user: { id: "u1" } } });
}

function signedOut() {
  auth.getSession.mockResolvedValue({ data: null });
}

describe("クラウド保存の設定", () => {
  const originalFlag = process.env.NEXT_PUBLIC_CLOUD_BACKUP_ENABLED;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
        auth.signOut.mockResolvedValue(undefined);
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
