// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ReportCard } from "./report-card";
import { COPY } from "@/lib/copy";
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

/** 評価語・助言に読める表現。報告書の画面に出てはいけない */
const FORBIDDEN_WORDS = [
  "すごい",
  "えらい",
  "順調",
  "好調",
  "改善",
  "悪化",
  "達成率",
  "サボ",
  "失敗",
  "できていません",
  "しましょう",
  "がんばり",
  "べき",
  "必ず",
  "危険",
];

const selfCareItems: SelfCareItem[] = [
  {
    id: "s1",
    title: "深呼吸",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

/** 直近7日に必ず入る日付。報告書の期間は「今日」を基準に決まる */
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

describe("ReportCard", () => {
  it("節ごとに文章と数値を並べる", async () => {
    mockData([
      makeRecord(daysAgo(1), { moodScore: 2, sleepMinutes: 400 }),
      makeRecord(daysAgo(2), { moodScore: 4, sleepMinutes: 440 }),
    ]);

    render(<ReportCard />);

    await waitFor(() => {
      expect(screen.getByText(COPY.report.sectionMood)).toBeTruthy();
    });
    expect(screen.getByText(COPY.report.narrativeMood[0])).toBeTruthy();
    expect(screen.getByText("3（5段階）")).toBeTruthy();
    expect(screen.getAllByText("記録した2日分").length).toBeGreaterThan(0);
  });

  it("記録がない期間でも、次に書くときの負担を下げる一文を出す", async () => {
    mockData([]);

    render(<ReportCard />);

    await waitFor(() => {
      expect(screen.getByText(COPY.report.emptyHeadline)).toBeTruthy();
    });
    // 記録が無いときはコピーの操作を出さない
    expect(screen.queryByText(COPY.report.copyAction)).toBeNull();
  });

  it("メモ本文と、共有の初期版で対象外の項目を画面に出さない", async () => {
    mockData([
      makeRecord(daysAgo(1), {
        note: "誰にも見せたくないメモ本文",
        warningNote: "自由記述のサインの説明",
        selfCareMemo: "セルフケアの感想の本文",
        tomorrowGoal: "明日の目標の文面",
        warningTags: ["眠れない"],
        warningLevel: "yes",
        medication: "forgot",
        selfCareIds: ["s1"],
      }),
    ]);

    const { container } = render(<ReportCard />);

    await waitFor(() => {
      expect(screen.getByText(COPY.report.sectionPeriod)).toBeTruthy();
    });

    const text = container.textContent ?? "";
    for (const forbidden of [
      "誰にも見せたくないメモ本文",
      "自由記述のサインの説明",
      "セルフケアの感想の本文",
      "明日の目標の文面",
      "眠れない",
      "深呼吸",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("評価語・助言に読める表現を画面に出さない", async () => {
    mockData([
      makeRecord(daysAgo(1), { moodScore: 1, sleepMinutes: 200 }),
      makeRecord(daysAgo(2), { moodScore: 5, sleepMinutes: 600, selfCareIds: ["s1"] }),
    ]);

    const { container } = render(<ReportCard />);

    await waitFor(() => {
      expect(screen.getByText(COPY.report.sectionSleep)).toBeTruthy();
    });

    const text = container.textContent ?? "";
    for (const word of FORBIDDEN_WORDS) {
      expect(text, word).not.toContain(word);
    }
  });

  it("診断や治療の判断には使えないことを添える", async () => {
    mockData([makeRecord(daysAgo(1))]);

    render(<ReportCard />);

    await waitFor(() => {
      expect(screen.getByText(COPY.report.notice)).toBeTruthy();
    });
    expect(screen.getByText(COPY.report.description)).toBeTruthy();
  });

  it("読み出しに失敗したら報告書を出さずに知らせる", async () => {
    getAllRecords.mockResolvedValue({
      ok: false,
      error: { code: "CORRUPTED", key: "records" },
    });
    getAllSelfCareItems.mockResolvedValue(ok(selfCareItems));

    render(<ReportCard />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.queryByText(COPY.report.copyAction)).toBeNull();
  });
});
