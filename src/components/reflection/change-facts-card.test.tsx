// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { ChangeFactsCard } from "./change-facts-card";
import { ok } from "@/lib/result";
import type { DailyRecord } from "@/lib/types";

const getAllRecords = vi.fn();

vi.mock("@/lib/repository", () => ({
  repository: {
    getAllRecords: () => getAllRecords(),
  },
}));

/** 直近7日に必ず入る日付 */
function daysAgo(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeRecord(
  date: string,
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    id: date,
    date,
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
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("相談先の導線", () => {
  it("記録がなくても相談先を開けるようにする", async () => {
    getAllRecords.mockResolvedValue(ok([]));
    render(<ChangeFactsCard />);

    await waitFor(() => {
      expect(screen.getByText(/1日分からで大丈夫です/)).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: /相談先を見る/ })
    ).toBeTruthy();
  });

  it("事実が多い日でも、相談先の見せ方を変えない", async () => {
    getAllRecords.mockResolvedValue(
      ok([
        makeRecord(daysAgo(0), {
          moodScore: 1,
          sleepMinutes: 280,
          medication: "forgot",
          warningLevel: "yes",
          warningTags: ["朝起きづらい"],
        }),
        makeRecord(daysAgo(1), {
          moodScore: 2,
          sleepMinutes: 300,
          medication: "forgot",
          warningLevel: "yes",
          warningTags: ["朝起きづらい"],
        }),
      ])
    );
    render(<ChangeFactsCard />);

    await waitFor(() => {
      expect(screen.getByText(/お薬を「忘れた」と記録した日/)).toBeTruthy();
    });

    const button = screen.getByRole("button", { name: /相談先を見る/ });
    // 強調や警告のスタイルを、事実の件数によって足さない
    expect(button.className).not.toContain("destructive");
    expect(button.className).not.toContain("animate-");
  });
});

describe("事実の表示", () => {
  it("数値には母数を添える", async () => {
    getAllRecords.mockResolvedValue(
      ok([makeRecord(daysAgo(0), { moodScore: 2 })])
    );
    render(<ChangeFactsCard />);

    await waitFor(() => {
      expect(screen.getByText(/気分を記録した1日分のうち/)).toBeTruthy();
    });
  });

  it("診断ではないことを必ず出す", async () => {
    getAllRecords.mockResolvedValue(
      ok([makeRecord(daysAgo(0), { moodScore: 2 })])
    );
    render(<ChangeFactsCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/これは診断ではなく、本人の記録の集計です。/)
      ).toBeTruthy();
    });
  });

  it("メモ本文を画面に出さない", async () => {
    getAllRecords.mockResolvedValue(
      ok([
        makeRecord(daysAgo(0), {
          moodScore: 2,
          note: "自由記述の内容",
          warningNote: "サインのメモ",
          selfCareMemo: "セルフケアのメモ",
        }),
      ])
    );
    render(<ChangeFactsCard />);

    await waitFor(() => {
      expect(screen.getByText(/気分を記録した1日分のうち/)).toBeTruthy();
    });

    const text = document.body.textContent ?? "";
    expect(text).not.toContain("自由記述の内容");
    expect(text).not.toContain("サインのメモ");
    expect(text).not.toContain("セルフケアのメモ");
  });

  it("記録がない期間を、書けなかったこととして書かない", async () => {
    getAllRecords.mockResolvedValue(ok([]));
    render(<ChangeFactsCard />);

    await waitFor(() => {
      expect(screen.getByText(/1日分からで大丈夫です/)).toBeTruthy();
    });

    const text = document.body.textContent ?? "";
    for (const word of ["0日", "未達", "達成率", "できていません", "頑張"]) {
      expect(text).not.toContain(word);
    }
  });
});
