// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { WeeklySummaryCard } from "./weekly-summary-card";
import { ok } from "@/lib/result";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

const getAllRecords = vi.fn();
const getAllSelfCareItems = vi.fn();

vi.mock("@/lib/repository", () => ({
  repository: {
    getAllRecords: () => getAllRecords(),
    getAllSelfCareItems: () => getAllSelfCareItems(),
  },
}));

const selfCareItems: SelfCareItem[] = [
  {
    id: "s1",
    title: "深呼吸",
    kind: "care",
    stateLevels: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

/** 直近7日に必ず入る日付。まとめの期間は「今日」を基準に決まる */
function daysAgo(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

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

function mockData(records: DailyRecord[]) {
  getAllRecords.mockResolvedValue(ok(records));
  getAllSelfCareItems.mockResolvedValue(ok(selfCareItems));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WeeklySummaryCard の空状態", () => {
  it("記録がなくても、書けなかったことを責める表示にしない", async () => {
    mockData([]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText(/1日分からで大丈夫です/)).toBeTruthy();
    });

    const text = document.body.textContent ?? "";
    for (const word of ["0日", "未達", "達成率", "できていません", "頑張"]) {
      expect(text).not.toContain(word);
    }
  });

  it("記録がないときはコピーのボタンを出さない", async () => {
    mockData([]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText(/1日分からで大丈夫です/)).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /まとめをコピー/ })).toBeNull();
  });
});

describe("WeeklySummaryCard の表示", () => {
  it("記録があれば見出しと各項目を出す", async () => {
    mockData([
      makeRecord(daysAgo(0), { moodScore: 4, sleepMinutes: 430 }),
      makeRecord(daysAgo(1), { moodScore: 2, sleepMinutes: 430 }),
    ]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText(/2日分の記録が残りました/)).toBeTruthy();
    });
    expect(screen.getByText("平均 3（5段階）")).toBeTruthy();
    expect(screen.getByText("平均 7時間10分")).toBeTruthy();
    expect(screen.getByRole("button", { name: /まとめをコピー/ })).toBeTruthy();
  });

  it("数値を出す項目には母数を添えて表示する", async () => {
    mockData([makeRecord(daysAgo(0), { moodScore: 4 })]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText(/記録した1日分/)).toBeTruthy();
    });
  });

  it("診断や治療の判断に使えない旨を常に出す", async () => {
    mockData([makeRecord(daysAgo(0))]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText(/診断や治療の判断には使えません/)).toBeTruthy();
    });
  });

  it("目標のふりかえりを日数と母数で出す", async () => {
    mockData([
      makeRecord(daysAgo(0), { goalReviewStatus: "done" }),
      makeRecord(daysAgo(1), { goalReviewStatus: "partial" }),
    ]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText("目標のふりかえり")).toBeTruthy();
    });
    expect(screen.getByText("できた 1日・一部できた 1日")).toBeTruthy();
    expect(screen.getByText("ふりかえった2日分")).toBeTruthy();
  });

  it("本人が書いた目標の文面を画面に出さない", async () => {
    mockData([
      makeRecord(daysAgo(0), {
        tomorrowGoal: "目標の文面",
        goalReviewStatus: "done",
      }),
    ]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText("目標のふりかえり")).toBeTruthy();
    });
    expect(document.body.textContent ?? "").not.toContain("目標の文面");
  });

  it("メモ本文を画面に出さない", async () => {
    mockData([
      makeRecord(daysAgo(0), {
        note: "自由記述の内容",
        warningNote: "警告のメモ",
        selfCareMemo: "セルフケアのメモ",
      }),
    ]);
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByText(/記録が残りました|毎日記録できています/)).toBeTruthy();
    });

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("自由記述の内容");
    expect(text).not.toContain("警告のメモ");
    expect(text).not.toContain("セルフケアのメモ");
  });
});

describe("WeeklySummaryCard の読み込み失敗", () => {
  it("読み込めなければ理由を伝える", async () => {
    getAllRecords.mockResolvedValue({
      ok: false,
      error: { code: "CORRUPTED", key: "yorucare_records" },
    });
    getAllSelfCareItems.mockResolvedValue(ok(selfCareItems));
    render(<WeeklySummaryCard />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });
});
