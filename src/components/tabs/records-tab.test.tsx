// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { getTodayString } from "@/lib/dates";
import { getRecordByDate } from "@/lib/storage";
import { TodayRecordTab } from "./today-record-tab";
import { RecordsTab } from "./records-tab";

vi.mock("@/components/shared/ai-share-panel", () => ({
  AiSharePanel: () => null,
}));
vi.mock("@/components/shared/anonymous-analytics-panel", () => ({
  AnonymousAnalyticsPanel: () => null,
}));
vi.mock("@/components/shared/data-backup-panel", () => ({
  DataBackupPanel: () => null,
}));
vi.mock("@/components/shared/cloud-backup-panel", () => ({
  CloudBackupPanel: () => null,
}));

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("記録したメモの一覧表示", () => {
  it("入力画面で保存したメモ全文を、詳細画面を開かずカード上に改行付きで表示する", async () => {
    const note = "午前はゆっくり過ごした\n夕方に散歩した";
    const todayView = render(
      <TodayRecordTab onNavigateTab={() => undefined} />
    );

    fireEvent.change(await screen.findByLabelText(COPY.memoOptional), {
      target: { value: note },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "記録を保存する" })
    );

    await waitFor(async () => {
      const saved = await getRecordByDate(getTodayString());
      expect(saved.ok && saved.value?.note).toBe(note);
    });

    todayView.unmount();
    render(<RecordsTab onNavigateTab={() => undefined} />);

    const memoLine = await screen.findByText(
      (_, element) =>
        element?.tagName === "P" &&
        element.textContent === `${COPY.memo}：${note}`
    );

    expect(memoLine.classList.contains("whitespace-pre-wrap")).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
