// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AccumulationCard } from "./accumulation-card";
import { ok } from "@/lib/result";
import type { DailyRecord } from "@/lib/types";

const getAllRecords = vi.fn();
const getReturnDate = vi.fn();
const saveReturnDate = vi.fn();

vi.mock("@/lib/repository", () => ({
  repository: {
    getAllRecords: () => getAllRecords(),
    getReturnDate: () => getReturnDate(),
    saveReturnDate: (date: string | null) => saveReturnDate(date),
  },
}));

/** 今日を基準にした日付。表示は「今日まで」を数える */
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AccumulationCard", () => {
  it("記録がない状態でも責めずに表示する", async () => {
    getAllRecords.mockResolvedValue(ok([]));
    getReturnDate.mockResolvedValue(ok(null));

    render(<AccumulationCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/書けそうなときに、1日分からで大丈夫です/)
      ).toBeTruthy();
    });
    expect(screen.queryByText("記録した日")).toBeNull();
  });

  it("累計を先に、連続を最後に並べる", async () => {
    getAllRecords.mockResolvedValue(
      ok([0, 1, 2, 3].map((offset) => makeRecord(daysAgo(offset))))
    );
    getReturnDate.mockResolvedValue(ok(null));

    render(<AccumulationCard />);

    await waitFor(() => {
      expect(screen.getByText("記録した日")).toBeTruthy();
    });

    const labels = screen
      .getAllByRole("term")
      .map((node) => node.textContent ?? "");
    expect(labels[0]).toBe("記録した日");
    expect(labels[1]).toBe("できたことがあった日");
    expect(labels[labels.length - 1]).toBe("続けて書けた日");
  });

  it("いま何日続いているかを画面に出さない", async () => {
    getAllRecords.mockResolvedValue(
      ok([0, 1, 2].map((offset) => makeRecord(daysAgo(offset))))
    );
    getReturnDate.mockResolvedValue(ok(null));

    const { container } = render(<AccumulationCard />);

    await waitFor(() => {
      expect(screen.getByText("記録した日")).toBeTruthy();
    });

    const text = container.textContent ?? "";
    expect(text).not.toContain("継続中");
    expect(text).not.toContain("連続中");
    expect(text).not.toContain("いま続");
  });

  it("節目に届いた日はねぎらいを出す", async () => {
    getAllRecords.mockResolvedValue(
      ok([0, 1, 2].map((offset) => makeRecord(daysAgo(offset))))
    );
    getReturnDate.mockResolvedValue(ok(null));

    render(<AccumulationCard />);

    await waitFor(() => {
      expect(
        screen.getByText("記録した日が3日になりました。ここまでおつかれさまです。")
      ).toBeTruthy();
    });
  });

  it("評価語・助言・診断に読める表現を画面に出さない", async () => {
    getAllRecords.mockResolvedValue(
      ok([0, 1, 2, 3, 4, 5, 6].map((offset) => makeRecord(daysAgo(offset))))
    );
    getReturnDate.mockResolvedValue(ok(daysAgo(30)));

    const { container } = render(<AccumulationCard />);

    await waitFor(() => {
      expect(screen.getByText("記録した日")).toBeTruthy();
    });

    const text = container.textContent ?? "";
    for (const word of [
      "すごい",
      "えらい",
      "順調",
      "改善",
      "悪化",
      "達成率",
      "サボ",
      "失敗",
      "できていません",
      "しましょう",
      "がんばり",
      "症状",
      "診断",
      "治療",
      "受診",
      "医師",
      "危険",
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it("復職日を設定すると保存し、復職からの日数として数え直す", async () => {
    getAllRecords.mockResolvedValue(ok([makeRecord(daysAgo(1))]));
    getReturnDate.mockResolvedValueOnce(ok(null));
    saveReturnDate.mockResolvedValue(ok(undefined));
    getReturnDate.mockResolvedValue(ok(daysAgo(10)));

    render(<AccumulationCard />);

    await waitFor(() => {
      expect(screen.getByText("はじめてからの日数")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "復職日を設定する" }));
    fireEvent.change(screen.getByLabelText("復職日"), {
      target: { value: daysAgo(10) },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(saveReturnDate).toHaveBeenCalledWith(daysAgo(10));
    });
    await waitFor(() => {
      expect(screen.getByText("復職からの日数")).toBeTruthy();
    });
  });

  it("復職日の設定を消すと、はじめて記録した日から数え直す", async () => {
    getAllRecords.mockResolvedValue(ok([makeRecord(daysAgo(1))]));
    getReturnDate.mockResolvedValueOnce(ok(daysAgo(10)));
    saveReturnDate.mockResolvedValue(ok(undefined));
    getReturnDate.mockResolvedValue(ok(null));

    render(<AccumulationCard />);

    await waitFor(() => {
      expect(screen.getByText("復職からの日数")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "復職日を変更する" }));
    fireEvent.click(screen.getByRole("button", { name: "設定を消す" }));

    await waitFor(() => {
      expect(saveReturnDate).toHaveBeenCalledWith(null);
    });
    await waitFor(() => {
      expect(screen.getByText("はじめてからの日数")).toBeTruthy();
    });
  });

  it("復職日を端末外へ出さないことを画面で伝える", async () => {
    getAllRecords.mockResolvedValue(ok([]));
    getReturnDate.mockResolvedValue(ok(null));

    render(<AccumulationCard />);

    await waitFor(() => {
      expect(
        screen.getByText(/この端末にだけ保存され、どこへも送信しません/)
      ).toBeTruthy();
    });
  });
});
