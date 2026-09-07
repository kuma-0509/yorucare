// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import {
  DEFAULT_RECORD_FORM_SECTIONS,
  saveRecordFormSections,
} from "@/lib/record-form-sections";
import { AppShell } from "./app-shell";

vi.mock("@/components/layout/app-header", () => ({ AppHeader: () => null }));
vi.mock("@/components/layout/build-footer", () => ({ BuildFooter: () => null }));
vi.mock("@/components/shared/storage-health-banner", () => ({
  StorageHealthBanner: () => null,
}));
vi.mock("@/components/shared/storage-notice-banner", () => ({
  StorageNoticeBanner: () => null,
}));
vi.mock("@/components/shared/backup-reminder-banner", () => ({
  BackupReminderBanner: () => null,
}));
vi.mock("@/components/shared/review-consent-dialog", () => ({
  ReviewConsentDialog: () => null,
}));
vi.mock("@/components/tabs/today-record-tab", () => ({
  TodayRecordTab: () => <p>今日の記録画面</p>,
}));
vi.mock("@/components/tabs/records-tab", () => ({
  RecordsTab: () => <p>記録一覧画面</p>,
}));
vi.mock("@/components/tabs/selfcare-tab", () => ({
  SelfCareTab: () => <p>セルフケア画面</p>,
}));
vi.mock("@/components/tabs/reflection-tab", () => ({
  ReflectionTab: () => null,
}));
vi.mock("@/lib/analytics", () => ({ trackTabViewed: vi.fn() }));
vi.mock("@/lib/keyboard-scroll", () => ({ useKeyboardInset: vi.fn() }));
vi.mock("@/lib/repository", () => ({
  repository: {
    runStorageMigrations: vi.fn().mockResolvedValue({
      ok: true,
      value: undefined,
    }),
  },
}));
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, resetScrollPosition: vi.fn() };
});

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AppShell のセルフケアタブ表示", () => {
  it("できたこと・やらないことがどちらも未選択なら第3ペインを表示しない", () => {
    render(<AppShell />);

    expect(screen.queryByRole("button", { name: COPY.tab.selfCare })).toBeNull();
  });

  it.each(["doneToday", "notToDo"] as const)(
    "%sを選択したときはセルフケアタブを表示する",
    async (key) => {
      saveRecordFormSections({
        ...DEFAULT_RECORD_FORM_SECTIONS,
        [key]: true,
      });
      render(<AppShell />);

      const tab = await screen.findByRole("button", { name: COPY.tab.selfCare });
      fireEvent.click(tab);
      expect(screen.getByText("セルフケア画面")).toBeTruthy();
    }
  );

  it("表示中に両項目を未選択へ戻すと書く画面へ戻る", async () => {
    saveRecordFormSections({
      ...DEFAULT_RECORD_FORM_SECTIONS,
      doneToday: true,
    });
    render(<AppShell />);

    fireEvent.click(await screen.findByRole("button", { name: COPY.tab.selfCare }));
    expect(screen.getByText("セルフケア画面")).toBeTruthy();

    act(() => saveRecordFormSections(DEFAULT_RECORD_FORM_SECTIONS));

    expect(screen.queryByRole("button", { name: COPY.tab.selfCare })).toBeNull();
    expect(screen.getByText("今日の記録画面")).toBeTruthy();
  });
});
