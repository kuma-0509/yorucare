// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { CloudRestoreDialog } from "./cloud-restore-dialog";

const CLOUD = COPY.cloudBackup;

const sync = vi.hoisted(() => ({
  fetchCloudSnapshot: vi.fn(),
  pushSnapshot: vi.fn(),
  claimThisDevice: vi.fn(),
}));
const exportLib = vi.hoisted(() => ({
  downloadBackup: vi.fn(),
  importBackup: vi.fn(),
}));
const repo = vi.hoisted(() => ({ buildExportPayload: vi.fn() }));

// 見せ方を決める planRestore / requiresLocalBackup は本物のまま使う
vi.mock("@/lib/cloud-sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cloud-sync")>(
    "@/lib/cloud-sync"
  );
  return { ...actual, ...sync };
});
vi.mock("@/lib/export", () => exportLib);
vi.mock("@/lib/repository", () => ({ repository: repo }));

function payload(dates: string[]) {
  return {
    version: 1 as const,
    exportedAt: "2026-09-08T12:00:00.000Z",
    returnDate: null,
    records: dates.map((date) => ({ date })),
    selfCareItems: [],
    notToDoItems: [],
  };
}

async function open() {
  await act(async () => {
    render(
      <CloudRestoreDialog open onOpenChange={() => undefined} />
    );
  });
}

async function clickAsync(element: HTMLElement) {
  await act(async () => {
    fireEvent.click(element);
  });
}

describe("クラウドから戻す画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sync.claimThisDevice.mockResolvedValue(true);
    sync.pushSnapshot.mockResolvedValue({
      status: "synced",
      storedAt: "2026-09-08T22:14:00.000Z",
      generation: 2,
    });
    exportLib.downloadBackup.mockResolvedValue({ ok: true, value: undefined });
    exportLib.importBackup.mockResolvedValue({
      ok: true,
      value: { recordCount: 2, selfCareCount: 0, notToDoCount: 0 },
    });
  });

  afterEach(cleanup);

  it("取り出せないときは、戻さずに知らせる", async () => {
    repo.buildExportPayload.mockResolvedValue({ ok: true, value: payload([]) });
    sync.fetchCloudSnapshot.mockResolvedValue({ status: "unavailable" });

    await open();

    expect(screen.getByText(CLOUD.restoreUnavailable)).toBeTruthy();
    expect(exportLib.importBackup).not.toHaveBeenCalled();
  });

  it("どちらにも記録がなければ、戻すものがないと伝える", async () => {
    repo.buildExportPayload.mockResolvedValue({ ok: true, value: payload([]) });
    sync.fetchCloudSnapshot.mockResolvedValue({ status: "empty" });

    await open();

    expect(screen.getByText(CLOUD.restoreNothing)).toBeTruthy();
  });

  it("端末が空ならクラウドの控えを戻し、この端末を預ける端末にする", async () => {
    repo.buildExportPayload.mockResolvedValue({ ok: true, value: payload([]) });
    sync.fetchCloudSnapshot.mockResolvedValue({
      status: "found",
      payload: payload(["2026-09-01", "2026-09-08"]),
      storedAt: "2026-09-08T22:14:00.000Z",
    });

    await open();
    expect(screen.getByText(CLOUD.restoreCloudOnly)).toBeTruthy();

    await clickAsync(
      screen.getByRole("button", { name: CLOUD.restoreCloudAction })
    );

    expect(exportLib.importBackup).toHaveBeenCalledTimes(1);
    expect(sync.claimThisDevice).toHaveBeenCalledTimes(1);
    expect(screen.getByText(CLOUD.restoreDone)).toBeTruthy();
  });

  it("クラウドが空なら、この端末の内容を預ける", async () => {
    repo.buildExportPayload.mockResolvedValue({
      ok: true,
      value: payload(["2026-09-08"]),
    });
    sync.fetchCloudSnapshot.mockResolvedValue({ status: "empty" });

    await open();
    expect(screen.getByText(CLOUD.restoreLocalOnly)).toBeTruthy();

    await clickAsync(
      screen.getByRole("button", { name: CLOUD.restoreUploadAction })
    );

    expect(sync.pushSnapshot).toHaveBeenCalledTimes(1);
    expect(exportLib.importBackup).not.toHaveBeenCalled();
  });

  describe("端末とクラウドの両方に記録があるとき", () => {
    beforeEach(() => {
      repo.buildExportPayload.mockResolvedValue({
        ok: true,
        value: payload(["2026-09-07", "2026-09-08"]),
      });
      sync.fetchCloudSnapshot.mockResolvedValue({
        status: "found",
        payload: payload(["2026-09-01", "2026-09-02", "2026-09-03"]),
        storedAt: "2026-09-03T22:14:00.000Z",
      });
    });

    it("自動で混ぜず、件数と期間を並べて本人に選ばせる", async () => {
      await open();

      expect(screen.getByText(CLOUD.restoreChoiceHeading)).toBeTruthy();
      expect(screen.getByText(CLOUD.restoreLocalColumn)).toBeTruthy();
      expect(screen.getByText(CLOUD.restoreCloudColumn)).toBeTruthy();
      expect(screen.getByText(CLOUD.confirmCounts(2, 0, 0))).toBeTruthy();
      expect(screen.getByText(CLOUD.confirmCounts(3, 0, 0))).toBeTruthy();
      expect(screen.getByText(CLOUD.confirmPeriod("9/7", "9/8"))).toBeTruthy();
      expect(screen.getByText(CLOUD.confirmPeriod("9/1", "9/3"))).toBeTruthy();

      expect(exportLib.importBackup).not.toHaveBeenCalled();
      expect(sync.pushSnapshot).not.toHaveBeenCalled();
    });

    it("ファイルに保存するまでは、どちらも選べない", async () => {
      await open();

      expect(screen.getByText(CLOUD.restoreBackupRequired)).toBeTruthy();
      const chooseCloud = screen.getByRole("button", {
        name: CLOUD.restoreChooseCloud,
      }) as HTMLButtonElement;
      const chooseLocal = screen.getByRole("button", {
        name: CLOUD.restoreChooseLocal,
      }) as HTMLButtonElement;

      expect(chooseCloud.disabled).toBe(true);
      expect(chooseLocal.disabled).toBe(true);

      await clickAsync(chooseCloud);
      expect(exportLib.importBackup).not.toHaveBeenCalled();
    });

    it("ファイルに保存したあとは選べる", async () => {
      await open();

      await clickAsync(
        screen.getByRole("button", { name: CLOUD.restoreBackupAction })
      );
      expect(exportLib.downloadBackup).toHaveBeenCalledTimes(1);

      const chooseCloud = screen.getByRole("button", {
        name: CLOUD.restoreChooseCloud,
      }) as HTMLButtonElement;
      expect(chooseCloud.disabled).toBe(false);

      await clickAsync(chooseCloud);
      expect(exportLib.importBackup).toHaveBeenCalledTimes(1);
      expect(sync.claimThisDevice).toHaveBeenCalledTimes(1);
    });

    it("ファイルに保存できなければ選べないままにする", async () => {
      exportLib.downloadBackup.mockResolvedValue({
        ok: false,
        error: { code: "BROWSER_ONLY" },
      });
      await open();

      await clickAsync(
        screen.getByRole("button", { name: CLOUD.restoreBackupAction })
      );

      const chooseCloud = screen.getByRole("button", {
        name: CLOUD.restoreChooseCloud,
      }) as HTMLButtonElement;
      expect(chooseCloud.disabled).toBe(true);
    });

    it("この端末を残す方を選ぶと、クラウドを上書きする", async () => {
      await open();

      await clickAsync(
        screen.getByRole("button", { name: CLOUD.restoreBackupAction })
      );
      await clickAsync(
        screen.getByRole("button", { name: CLOUD.restoreChooseLocal })
      );

      expect(sync.pushSnapshot).toHaveBeenCalledTimes(1);
      expect(exportLib.importBackup).not.toHaveBeenCalled();
      expect(sync.claimThisDevice).toHaveBeenCalledTimes(1);
    });
  });
});
