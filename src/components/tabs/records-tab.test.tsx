// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RecordsTab } from "./records-tab";
import { ok } from "@/lib/result";
import { getTodayString } from "@/lib/dates";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

const getAllRecords = vi.fn();
const initSelfCareIfEmpty = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>(
    "@/lib/storage"
  );
  return {
    ...actual,
    getAllRecords: () => getAllRecords(),
    initSelfCareIfEmpty: () => initSelfCareIfEmpty(),
  };
});

function makeRecord(
  date: string,
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    id: date,
    date,
    moodScore: 3,
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
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

async function renderTab(records: DailyRecord[], items: SelfCareItem[] = []) {
  getAllRecords.mockResolvedValue(ok(records));
  initSelfCareIfEmpty.mockResolvedValue(ok(items));
  render(<RecordsTab onNavigateTab={() => {}} />);
  // 読み込み後の一覧が出るまで待つ
  await screen.findByText("直近7日の記録です。1週間以内ならあとから直せます。");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("これまでの記録に出す目標", () => {
  it("その日に決めた目標を記録カードに出す", async () => {
    const today = getTodayString();
    await renderTab([
      makeRecord(today, { tomorrowGoal: "昼休みに5分だけ外に出る" }),
    ]);

    expect(screen.getAllByText("翌日の小さな目標：").length).toBeGreaterThan(0);
    expect(screen.getByText("昼休みに5分だけ外に出る")).toBeTruthy();
  });

  it("目標を決めていない日は、決めていないと分かる文を出す", async () => {
    const today = getTodayString();
    await renderTab([makeRecord(today, { tomorrowGoal: "" })]);

    expect(screen.getByText("まだ決めていません")).toBeTruthy();
  });

  it("ふりかえりを選んだ日は、その結果も出す", async () => {
    const today = getTodayString();
    await renderTab([
      makeRecord(today, {
        tomorrowGoal: "夕食のあとに皿を1枚だけ洗う",
        goalReviewStatus: "partial",
      }),
    ]);

    expect(screen.getByText("前日の目標のふりかえり：")).toBeTruthy();
    expect(screen.getByText("一部できた")).toBeTruthy();
  });

  it("ふりかえりを選んでいない日は、ふりかえりの行を出さない", async () => {
    const today = getTodayString();
    await renderTab([
      makeRecord(today, { tomorrowGoal: "昼休みに5分だけ外に出る" }),
    ]);

    expect(screen.queryByText("前日の目標のふりかえり：")).toBeNull();
  });

  it("保存だけした日には目標の行を出さない", async () => {
    const today = getTodayString();
    await renderTab([
      makeRecord(today, { moodScore: null, tomorrowGoal: "" }),
    ]);

    expect(screen.getByText(/保存だけした日です/)).toBeTruthy();
    expect(screen.queryByText("翌日の小さな目標：")).toBeNull();
    expect(screen.queryByText("まだ決めていません")).toBeNull();
  });

  it("記録がない日には目標の行を出さない", async () => {
    await renderTab([]);

    expect(screen.queryByText("翌日の小さな目標：")).toBeNull();
    expect(screen.queryByText("まだ決めていません")).toBeNull();
  });

  it("「詳しく見る」でも目標とふりかえりを読み返せる", async () => {
    const today = getTodayString();
    await renderTab([
      makeRecord(today, {
        tomorrowGoal: "朝に窓を開ける",
        goalReviewStatus: "done",
      }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "詳しく見る" }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("翌日の小さな目標：")).toBeTruthy();
    expect(dialog.getByText("朝に窓を開ける")).toBeTruthy();
    expect(dialog.getByText("前日の目標のふりかえり：")).toBeTruthy();
    expect(dialog.getByText("できた")).toBeTruthy();
  });

  it("目標の表示に評価や助言の言葉を混ぜない", async () => {
    const today = getTodayString();
    await renderTab([
      makeRecord(today, {
        tomorrowGoal: "朝に窓を開ける",
        goalReviewStatus: "notDone",
      }),
    ]);

    const text = document.body.textContent ?? "";
    for (const word of ["失敗", "守れ", "サボ", "なぜ", "どうして", "頑張りましょう"]) {
      expect(text).not.toContain(word);
    }
  });
});
