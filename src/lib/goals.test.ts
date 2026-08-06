import { describe, expect, it } from "vitest";
import {
  buildSmallerStepSuggestions,
  getGoalResultLabel,
  getGoalToReview,
  getPreviousDayGoal,
  needsSmallerStep,
} from "./goals";
import { MAX_GOAL_LENGTH } from "./schemas";
import type { DailyRecord } from "./types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-08-05",
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
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("getPreviousDayGoal", () => {
  it("記録がない日は、ふりかえる行動なしとして扱う", () => {
    expect(getPreviousDayGoal(null)).toBe("");
  });

  it("前日に何も決めていなければ問いかけない", () => {
    expect(getPreviousDayGoal(makeRecord())).toBe("");
    expect(getPreviousDayGoal(makeRecord({ goal: "   " }))).toBe("");
  });

  it("前日に決めた行動を返す", () => {
    expect(getPreviousDayGoal(makeRecord({ goal: "5分だけ横になる" }))).toBe(
      "5分だけ横になる"
    );
  });
});

describe("getGoalToReview", () => {
  it("結果を選ぶ前は前日の記録の行動を使う", () => {
    expect(
      getGoalToReview(
        { goalResult: null, goalReviewedText: "" },
        "5分だけ横になる"
      )
    ).toBe("5分だけ横になる");
  });

  it("結果を選んだあとは、そのとき写した行動を使う", () => {
    expect(
      getGoalToReview(
        { goalResult: "done", goalReviewedText: "5分だけ横になる" },
        "あとから書き換えた行動"
      )
    ).toBe("5分だけ横になる");
  });
});

describe("needsSmallerStep", () => {
  it("未選択と「できた」では案を出さない", () => {
    expect(needsSmallerStep(null)).toBe(false);
    expect(needsSmallerStep("done")).toBe(false);
  });

  it("「一部できた」「できなかった」では案を出す", () => {
    expect(needsSmallerStep("partial")).toBe(true);
    expect(needsSmallerStep("missed")).toBe(true);
  });
});

describe("buildSmallerStepSuggestions", () => {
  it("行動の内容は書き換えず、小さくする幅だけを添える", () => {
    expect(buildSmallerStepSuggestions("散歩する")).toEqual([
      "散歩する（5分だけ）",
      "散歩する（1回だけ）",
      "散歩する（準備だけ）",
    ]);
  });

  it("行動が空なら案を出さない", () => {
    expect(buildSmallerStepSuggestions("")).toEqual([]);
    expect(buildSmallerStepSuggestions("   ")).toEqual([]);
  });

  it("すでに付いている幅は重ねて出さない", () => {
    expect(buildSmallerStepSuggestions("散歩する（5分だけ）")).toEqual([
      "散歩する（5分だけ）（1回だけ）",
      "散歩する（5分だけ）（準備だけ）",
    ]);
  });

  it("上限を超える案は出さない", () => {
    const long = "あ".repeat(MAX_GOAL_LENGTH - 2);
    expect(buildSmallerStepSuggestions(long)).toEqual([]);
  });
});

describe("getGoalResultLabel", () => {
  it("結果の表示名を返す", () => {
    expect(getGoalResultLabel("done")).toBe("できた");
    expect(getGoalResultLabel("partial")).toBe("一部できた");
    expect(getGoalResultLabel("missed")).toBe("できなかった");
  });

  it("未選択のときは表示しない", () => {
    expect(getGoalResultLabel(null)).toBe("");
  });
});
