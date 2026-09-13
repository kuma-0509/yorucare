// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";

const buildExportPayload = vi.fn();
const trackEvent = vi.fn();

vi.mock("./repository", () => ({
  repository: {
    buildExportPayload: () => buildExportPayload(),
  },
}));

vi.mock("./analytics", () => ({
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

import { downloadBackup } from "./export";

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:test"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("downloadBackup", () => {
  it("書き出しに失敗したときはバックアップ済みにしない", async () => {
    buildExportPayload.mockResolvedValue({
      ok: false,
      error: { code: "CORRUPTED", key: STORAGE_KEYS.records },
    });

    const result = await downloadBackup();

    expect(result.ok).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.lastBackupAt)).toBeNull();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("書き出しに成功したときだけバックアップ済みにする", async () => {
    buildExportPayload.mockResolvedValue({
      ok: true,
      value: {
        version: 1,
        exportedAt: "2026-01-20T12:00:00.000Z",
        returnDate: null,
        records: [],
        selfCareItems: [],
        notToDoItems: [],
      },
    });

    const result = await downloadBackup();

    expect(result.ok).toBe(true);
    expect(localStorage.getItem(STORAGE_KEYS.lastBackupAt)).toBeTruthy();
    expect(trackEvent).toHaveBeenCalledWith("backup_exported");
  });
});
