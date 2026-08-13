import { describe, expect, it } from "vitest";
import {
  buildSmallerGoalSuggestions,
  GOAL_HELPER_QUESTIONS,
  getGoalToReview,
} from "./goal";
import { MAX_GOAL_LENGTH } from "./schemas";
import type { DailyRecord } from "./types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-08-12",
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
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("getGoalToReview", () => {
  it("前日の記録がない日はnullを返す", () => {
    expect(getGoalToReview(null)).toBeNull();
  });

  it("前日に目標を決めていない日はnullを返す", () => {
    expect(getGoalToReview(makeRecord({ tomorrowGoal: "" }))).toBeNull();
  });

  it("空白だけの目標はふりかえりの対象にしない", () => {
    expect(getGoalToReview(makeRecord({ tomorrowGoal: "　 " }))).toBeNull();
  });

  it("前日に決めた目標を前後の空白を除いて返す", () => {
    expect(
      getGoalToReview(makeRecord({ tomorrowGoal: " 昼休みに5分だけ外に出る " }))
    ).toBe("昼休みに5分だけ外に出る");
  });
});

describe("buildSmallerGoalSuggestions", () => {
  it("空の目標には提案を出さない", () => {
    expect(buildSmallerGoalSuggestions("")).toEqual([]);
    expect(buildSmallerGoalSuggestions("   ")).toEqual([]);
  });

  it("目標を小さくした案を返す", () => {
    expect(buildSmallerGoalSuggestions("散歩する")).toEqual([
      "散歩を5分だけやる",
      "散歩の準備だけする",
      "散歩を1回だけやる",
    ]);
  });

  it("「する」で終わらない目標もそのまま語幹として使う", () => {
    expect(buildSmallerGoalSuggestions("朝の掃除")).toContain(
      "朝の掃除を5分だけやる"
    );
  });

  it("末尾の句点を取り除く", () => {
    expect(buildSmallerGoalSuggestions("散歩する。")).toContain(
      "散歩を5分だけやる"
    );
  });

  it("元の目標と同じ文は提案しない", () => {
    const suggestions = buildSmallerGoalSuggestions("散歩を5分だけやる");
    expect(suggestions).not.toContain("散歩を5分だけやる");
  });

  it("提案はそのまま目標として保存できる長さに収まる", () => {
    const longGoal = "あ".repeat(MAX_GOAL_LENGTH);
    for (const suggestion of buildSmallerGoalSuggestions(longGoal)) {
      expect(suggestion.length).toBeLessThanOrEqual(MAX_GOAL_LENGTH);
    }
  });
});

describe("GOAL_HELPER_QUESTIONS", () => {
  it("理由を問いただす表現を含めない", () => {
    for (const question of GOAL_HELPER_QUESTIONS) {
      expect(question).not.toMatch(/なぜ|どうして/);
    }
  });
});
