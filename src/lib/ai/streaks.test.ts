import { describe, expect, it } from "vitest";
import { findStreaks } from "./streaks";
import type { DailyRecord } from "../types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-07-21",
    moodScore: 4,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    sleepMinutes: 480,
    medication: "done",
    warningLevel: "none",
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    note: "",
    goal: "",
    goalResult: null,
    goalReviewedText: "",
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

function recordsOn(dates: string[], overrides: Partial<DailyRecord> = {}) {
  return dates.map((date) => makeRecord({ id: date, date, ...overrides }));
}

describe("findStreaks", () => {
  it("minDays 以上続いた区間だけを返す", () => {
    const result = findStreaks(
      recordsOn(["2026-07-21", "2026-07-22", "2026-07-23", "2026-07-25"]),
      "2026-07-21",
      "2026-07-25",
      { metric: "recorded" },
      3
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-23", days: 3 },
    ]);
    expect(result.matchedDays).toBe(4);
  });

  it("未記録日が連続を途切れさせる", () => {
    const result = findStreaks(
      recordsOn(["2026-07-21", "2026-07-22", "2026-07-24", "2026-07-25"]),
      "2026-07-21",
      "2026-07-25",
      { metric: "recorded" },
      2
    );

    // 記録がない 07-23 をまたいで4日続いたことにはしない
    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-22", days: 2 },
      { from: "2026-07-24", to: "2026-07-25", days: 2 },
    ]);
    expect(result.unrecordedDays).toBe(1);
  });

  it("期間の最終日まで続く区間を閉じる", () => {
    const result = findStreaks(
      recordsOn(["2026-07-21", "2026-07-22", "2026-07-23"]),
      "2026-07-21",
      "2026-07-23",
      { metric: "recorded" },
      2
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-23", days: 3 },
    ]);
  });

  it("moodScore が閾値以下の連続を検出する", () => {
    const result = findStreaks(
      [
        makeRecord({ id: "a", date: "2026-07-21", moodScore: 2 }),
        makeRecord({ id: "b", date: "2026-07-22", moodScore: 1 }),
        makeRecord({ id: "c", date: "2026-07-23", moodScore: 4 }),
      ],
      "2026-07-21",
      "2026-07-23",
      { metric: "moodScore", comparison: "atMost", value: 2 },
      2
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-22", days: 2 },
    ]);
  });

  it("moodScore が未入力の日は条件を満たさない", () => {
    const result = findStreaks(
      [
        makeRecord({ id: "a", date: "2026-07-21", moodScore: 2 }),
        makeRecord({ id: "b", date: "2026-07-22", moodScore: null }),
        makeRecord({ id: "c", date: "2026-07-23", moodScore: 2 }),
      ],
      "2026-07-21",
      "2026-07-23",
      { metric: "moodScore", comparison: "atMost", value: 2 },
      2
    );

    expect(result.streaks).toEqual([]);
    expect(result.matchedDays).toBe(2);
    // 記録はあるので未記録日ではない
    expect(result.unrecordedDays).toBe(0);
  });

  it("睡眠時間が閾値以上の連続を検出する", () => {
    const result = findStreaks(
      [
        makeRecord({ id: "a", date: "2026-07-21", sleepMinutes: 420 }),
        makeRecord({ id: "b", date: "2026-07-22", sleepMinutes: 300 }),
        makeRecord({ id: "c", date: "2026-07-23", sleepMinutes: 480 }),
        makeRecord({ id: "d", date: "2026-07-24", sleepMinutes: 460 }),
      ],
      "2026-07-21",
      "2026-07-24",
      { metric: "sleepMinutes", comparison: "atLeast", value: 400 },
      2
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-23", to: "2026-07-24", days: 2 },
    ]);
  });

  it("服薬の状態を指定して連続を検出する", () => {
    const result = findStreaks(
      [
        makeRecord({ id: "a", date: "2026-07-21", medication: "done" }),
        makeRecord({ id: "b", date: "2026-07-22", medication: "partial" }),
        makeRecord({ id: "c", date: "2026-07-23", medication: "forgot" }),
      ],
      "2026-07-21",
      "2026-07-23",
      { metric: "medication", statuses: ["done", "partial"] },
      2
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-22", days: 2 },
    ]);
  });

  it("警告サインの段階を指定して連続を検出する", () => {
    const result = findStreaks(
      [
        makeRecord({ id: "a", date: "2026-07-21", warningLevel: "yes" }),
        makeRecord({ id: "b", date: "2026-07-22", warningLevel: "small" }),
        makeRecord({ id: "c", date: "2026-07-23", warningLevel: "none" }),
      ],
      "2026-07-21",
      "2026-07-23",
      { metric: "warningLevel", levels: ["yes", "small"] },
      2
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-22", days: 2 },
    ]);
  });

  it("条件を満たす日がなければ空を返す", () => {
    const result = findStreaks([], "2026-07-21", "2026-07-23", { metric: "recorded" }, 2);

    expect(result.streaks).toEqual([]);
    expect(result.matchedDays).toBe(0);
    expect(result.unrecordedDays).toBe(3);
  });

  it("minDays が0以下でも1日以上として扱う", () => {
    const result = findStreaks(
      recordsOn(["2026-07-21"]),
      "2026-07-21",
      "2026-07-21",
      { metric: "recorded" },
      0
    );

    expect(result.streaks).toEqual([
      { from: "2026-07-21", to: "2026-07-21", days: 1 },
    ]);
  });
});
