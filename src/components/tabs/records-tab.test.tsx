// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COPY } from "@/lib/copy";
import { getLast7Days, getTodayString, getYesterdayString } from "@/lib/dates";
import { createEmptyRecordForm, getRecordByDate, saveRecord } from "@/lib/storage";
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

async function saveDay(
  date: string,
  overrides: Partial<ReturnType<typeof createEmptyRecordForm>> = {}
) {
  const form = createEmptyRecordForm(date);
  const result = await saveRecord(date, { ...form, ...overrides });
  expect(result.ok).toBe(true);
}

describe("記録一覧の表表示", () => {
  it("入力画面で保存したメモ全文を、詳細画面を開かず表のセルへ改行付きで表示する", async () => {
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

    const table = await screen.findByRole("table", {
      name: COPY.recordsList.caption,
    });
    const memoCell = within(table).getByText(
      (_, element) =>
        element?.tagName === "P" && element.textContent === note
    );

    expect(memoCell.tagName).toBe("P");
    expect(memoCell.classList.contains("whitespace-pre-wrap")).toBe(true);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("直近7日を1つの表に並べ、未記録の日は空欄行として出す", async () => {
    render(<RecordsTab onNavigateTab={() => undefined} />);

    const table = await screen.findByRole("table", {
      name: COPY.recordsList.caption,
    });
    const rows = within(table).getAllByRole("row");

    expect(rows).toHaveLength(8);
    expect(
      within(table).getAllByRole("button", {
        name: COPY.recordsList.addRecord,
      })
    ).toHaveLength(7);
    expect(
      screen.queryByText("この日はまだ記録がありません。")
    ).toBeNull();
  });

  it("記録済みの日は同じ行に気分・睡眠・メモを出し、詳しく見る・編集できる", async () => {
    const yesterday = getYesterdayString();
    await saveDay(yesterday, {
      moodScore: 3,
      sleepStart: "00:21",
      sleepEnd: "06:21",
      note: "今日は飲み会楽しかった",
    });
    const onNavigateTab = vi.fn();

    render(<RecordsTab onNavigateTab={onNavigateTab} />);

    const table = await screen.findByRole("table", {
      name: COPY.recordsList.caption,
    });

    expect(within(table).getByText("ふつう")).toBeTruthy();
    expect(within(table).getByText("00:21〜06:21（6時間）")).toBeTruthy();
    expect(within(table).getByText("今日は飲み会楽しかった")).toBeTruthy();

    fireEvent.click(
      within(table).getByRole("button", { name: COPY.recordsList.viewDetail })
    );
    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));

    fireEvent.click(
      within(table).getByRole("button", { name: COPY.recordsList.edit })
    );
    expect(onNavigateTab).toHaveBeenCalledWith("today", {
      recordDate: yesterday,
    });
  });

  it("未記録の日の「この日の記録をつける」で書くタブへ日付付きで移る", async () => {
    const onNavigateTab = vi.fn();
    render(<RecordsTab onNavigateTab={onNavigateTab} />);

    const table = await screen.findByRole("table", {
      name: COPY.recordsList.caption,
    });
    fireEvent.click(
      within(table).getAllByRole("button", {
        name: COPY.recordsList.addRecord,
      })[0]
    );

    expect(onNavigateTab).toHaveBeenCalledWith("today", {
      recordDate: getLast7Days()[6],
    });
  });

  it("空欄だけで保存した日は空欄の行で編集できる", async () => {
    await saveDay(getTodayString());
    render(<RecordsTab onNavigateTab={() => undefined} />);

    const table = await screen.findByRole("table", {
      name: COPY.recordsList.caption,
    });

    expect(
      within(table).getByRole("button", { name: COPY.recordsList.edit })
    ).toBeTruthy();
    expect(
      within(table).getByRole("button", { name: COPY.recordsList.viewDetail })
    ).toBeTruthy();
    expect(
      within(table).getAllByRole("button", {
        name: COPY.recordsList.addRecord,
      })
    ).toHaveLength(6);
  });
});
