// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TodayRecordTab } from "./today-record-tab";
import { ok } from "@/lib/result";
import {
  getPreviousDateString as previousDateString,
  getTodayString as todayString,
} from "@/lib/dates";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

const getRecordByDate = vi.fn();
const getAllRecords = vi.fn();
const initSelfCareIfEmpty = vi.fn();
const saveRecord = vi.fn();
const addSelfCareItem = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/repository")>(
      "@/lib/repository"
    );
  return {
    recordToFormState: actual.recordToFormState,
    getRecordByDate: (date: string) => getRecordByDate(date),
    getAllRecords: () => getAllRecords(),
    initSelfCareIfEmpty: () => initSelfCareIfEmpty(),
    saveRecord: (date: string, data: unknown) => saveRecord(date, data),
    addSelfCareItem: (title: string) => addSelfCareItem(title),
  };
});

vi.mock("@/lib/analytics", () => ({
  trackRecordSaved: vi.fn(),
}));

const selfCareItems: SelfCareItem[] = [
  {
    id: "s1",
    title: "深呼吸",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
];

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-08-06",
    moodScore: null,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    sleepMinutes: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    note: "",
    goal: "",
    goalResult: null,
    goalReviewedText: "",
    createdAt: "2026-08-06T00:00:00.000Z",
    updatedAt: "2026-08-06T00:00:00.000Z",
    ...overrides,
  };
}

/** 日付ごとの記録。指定がない日は「記録なし」 */
async function renderTab(
  record: DailyRecord | null = null,
  previousDayRecord: DailyRecord | null = null
) {
  const target = todayString();
  const previous = previousDateString(target);
  getRecordByDate.mockImplementation((date: string) => {
    if (date === target) return Promise.resolve(ok(record));
    if (date === previous) return Promise.resolve(ok(previousDayRecord));
    return Promise.resolve(ok(null));
  });
  getAllRecords.mockResolvedValue(ok([]));
  initSelfCareIfEmpty.mockResolvedValue(ok(selfCareItems));
  render(<TodayRecordTab onNavigateTab={() => {}} />);
  // 読み込み完了まで待つ
  await screen.findByRole("radio", { name: "ふつう" });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TodayRecordTab の入口", () => {
  it("最初は3段階だけを出し、ほかの質問は出さない", async () => {
    await renderTab();

    expect(screen.getByRole("radio", { name: "よい" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "ふつう" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "しんどい" })).toBeDefined();

    expect(screen.queryByLabelText("寝た時間")).toBeNull();
    expect(screen.queryByRole("radio", { name: "少しあり" })).toBeNull();
    expect(screen.queryByText("今日できたこと")).toBeNull();
    expect(
      screen.getByText("選ぶと、そのときに合う項目だけが表示されます。")
    ).toBeDefined();
  });

  it("「よい」を選ぶと、できたことだけが増えてサインは開かない", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("radio", { name: "よい" }));

    expect(screen.getByRole("radio", { name: "よい" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("今日できたこと")).toBeDefined();
    expect(screen.getByText("深呼吸")).toBeDefined();
    expect(screen.queryByRole("radio", { name: "少しあり" })).toBeNull();
    // 残りの項目は閉じたまま用意され、必要なときだけ開ける
    expect(screen.getByText("ほかの項目も書く（任意）")).toBeDefined();
    expect(screen.queryByLabelText("寝た時間")).toBeNull();
  });

  it("「しんどい」を選ぶと、しんどさのサインを開いて出す", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("radio", { name: "しんどい" }));

    expect(screen.getByRole("radio", { name: "なし" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "少しあり" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "あり" })).toBeDefined();
    expect(screen.getByText("今日できたこと")).toBeDefined();
  });

  it("「あり」を選んだときだけサインのタグを出す", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("radio", { name: "しんどい" }));
    expect(screen.queryByText("眠れない")).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "少しあり" }));
    expect(screen.getByText("眠れない")).toBeDefined();
  });

  it("5段階でくわしく選んでも、入口の段階表示は保たれる", async () => {
    await renderTab();

    fireEvent.click(screen.getByText("5段階でくわしく選ぶ"));
    fireEvent.click(screen.getByRole("radio", { name: "かなり良い" }));

    expect(
      screen.getByRole("radio", { name: "よい" }).getAttribute("aria-checked")
    ).toBe("true");

    // 同じ段階を選び直しても、5段階で選んだ細かさを上書きしない
    fireEvent.click(screen.getByRole("radio", { name: "よい" }));
    expect(
      screen
        .getByRole("radio", { name: "かなり良い" })
        .getAttribute("aria-checked")
    ).toBe("true");
  });

  it("5段階で選び直すと入口の段階も入れ替わる", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("radio", { name: "よい" }));
    fireEvent.click(screen.getByText("5段階でくわしく選ぶ"));
    fireEvent.click(screen.getByRole("radio", { name: "かなりしんどい" }));

    expect(
      screen
        .getByRole("radio", { name: "しんどい" })
        .getAttribute("aria-checked")
    ).toBe("true");
    expect(screen.getByRole("radio", { name: "少しあり" })).toBeDefined();
  });

  it("選んだ気分は5段階の選択から取り消せる", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("radio", { name: "よい" }));
    fireEvent.click(screen.getByText("5段階でくわしく選ぶ"));
    // 選択中の5段階をもう一度押すと未入力へ戻す
    fireEvent.click(screen.getByRole("radio", { name: "まあまあ良い" }));

    expect(
      screen.getByRole("radio", { name: "よい" }).getAttribute("aria-checked")
    ).toBe("false");
    expect(
      screen
        .getByRole("radio", { name: "まあまあ良い" })
        .getAttribute("aria-checked")
    ).toBe("false");
  });

  it("入口が未選択でも、すでに書いてある記録は隠さない", async () => {
    await renderTab(makeRecord({ sleepStart: "23:30", sleepEnd: "07:00" }));

    expect(
      screen.getByRole("radio", { name: "ふつう" }).getAttribute("aria-checked")
    ).toBe("false");
    expect(screen.getByLabelText("寝た時間")).toBeDefined();
  });
});

describe("TodayRecordTab の目標のふりかえり", () => {
  it("前日に決めた行動がなければ問いかけない", async () => {
    await renderTab(null, makeRecord({ goal: "" }));

    expect(screen.queryByText("前の日に決めたこと")).toBeNull();
  });

  it("前日に決めた行動を、記録を始める前に自動で出す", async () => {
    await renderTab(null, makeRecord({ goal: "5分だけ横になる" }));

    expect(screen.getByText("前の日に決めたこと")).toBeDefined();
    expect(screen.getByText("「5分だけ横になる」")).toBeDefined();
    expect(screen.getByRole("radio", { name: "できた" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "一部できた" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "できなかった" })).toBeDefined();
  });

  it("「できた」では行動を小さくする案を出さない", async () => {
    await renderTab(null, makeRecord({ goal: "5分だけ横になる" }));

    fireEvent.click(screen.getByRole("radio", { name: "できた" }));

    expect(screen.queryByText("どこまでならできそうでしたか？")).toBeNull();
  });

  it("「できなかった」では、小さくした案を選んで次の日の行動にできる", async () => {
    await renderTab(null, makeRecord({ goal: "散歩する" }));

    fireEvent.click(screen.getByRole("radio", { name: "できなかった" }));

    expect(screen.getByText("どこまでならできそうでしたか？")).toBeDefined();
    const suggestion = screen.getByRole("button", {
      name: "散歩する（5分だけ）",
    });
    fireEvent.click(suggestion);

    const goalInput = screen.getByLabelText("ためすこと") as HTMLInputElement;
    expect(goalInput.value).toBe("散歩する（5分だけ）");
  });

  it("結果を選び直すと、案の表示も切り替わる", async () => {
    await renderTab(null, makeRecord({ goal: "散歩する" }));

    fireEvent.click(screen.getByRole("radio", { name: "一部できた" }));
    expect(screen.getByText("どこまでならできそうでしたか？")).toBeDefined();

    // もう一度押すと未選択へ戻す
    fireEvent.click(screen.getByRole("radio", { name: "一部できた" }));
    expect(screen.queryByText("どこまでならできそうでしたか？")).toBeNull();
    expect(screen.getByText("「散歩する」")).toBeDefined();
  });

  it("結果を選んだあとは、前日の記録を書き換えても対象がずれない", async () => {
    await renderTab(
      makeRecord({
        goalResult: "done",
        goalReviewedText: "前に決めた行動",
      }),
      makeRecord({ goal: "あとから書き換えた行動" })
    );

    expect(screen.getByText("「前に決めた行動」")).toBeDefined();
    expect(
      screen.getByRole("radio", { name: "できた" }).getAttribute("aria-checked")
    ).toBe("true");
  });
});
