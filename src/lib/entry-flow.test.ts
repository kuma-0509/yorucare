import { describe, expect, it } from "vitest";
import {
  applyCondition,
  conditionFromMoodScore,
  getFollowUpSections,
  hasOptionalDetailInput,
  hasWarningInput,
  moodScoreForCondition,
  shouldRevealFollowUps,
} from "./entry-flow";
import type { DailyRecord } from "./types";

type FormState = Omit<
  DailyRecord,
  "id" | "createdAt" | "updatedAt" | "sleepMinutes"
>;

function makeForm(overrides: Partial<FormState> = {}): FormState {
  return {
    date: "2026-08-06",
    moodScore: null,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    note: "",
    ...overrides,
  };
}

describe("conditionFromMoodScore", () => {
  it("5段階を3段階の入口へ対応づける", () => {
    expect(conditionFromMoodScore(5)).toBe("good");
    expect(conditionFromMoodScore(4)).toBe("good");
    expect(conditionFromMoodScore(3)).toBe("normal");
    expect(conditionFromMoodScore(2)).toBe("hard");
    expect(conditionFromMoodScore(1)).toBe("hard");
  });

  it("未入力は段階なしとして扱う", () => {
    expect(conditionFromMoodScore(null)).toBeNull();
  });
});

describe("moodScoreForCondition", () => {
  it("3段階から入ったときの総合気分を返す", () => {
    expect(moodScoreForCondition("good")).toBe(4);
    expect(moodScoreForCondition("normal")).toBe(3);
    expect(moodScoreForCondition("hard")).toBe(2);
  });

  it("往復しても段階が変わらない", () => {
    for (const level of ["good", "normal", "hard"] as const) {
      expect(conditionFromMoodScore(moodScoreForCondition(level))).toBe(level);
    }
  });
});

describe("applyCondition", () => {
  it("未入力から選んだときは既定の総合気分が入る", () => {
    expect(applyCondition(null, "good")).toBe(4);
    expect(applyCondition(null, "hard")).toBe(2);
  });

  it("同じ段階なら5段階で選んだ細かさを保つ", () => {
    expect(applyCondition(5, "good")).toBe(5);
    expect(applyCondition(1, "hard")).toBe(1);
  });

  it("別の段階を選んだときは入れ替える", () => {
    expect(applyCondition(5, "hard")).toBe(2);
    expect(applyCondition(1, "normal")).toBe(3);
  });
});

describe("getFollowUpSections", () => {
  it("未選択のときは追加の質問を出さない", () => {
    expect(getFollowUpSections(null)).toEqual([]);
  });

  it("よい・ふつうではしんどさのサインを最初から出さない", () => {
    expect(getFollowUpSections("good")).toEqual(["selfCare"]);
    expect(getFollowUpSections("normal")).toEqual(["selfCare"]);
  });

  it("しんどいときはサインを先頭に出す", () => {
    expect(getFollowUpSections("hard")).toEqual(["warningSign", "selfCare"]);
  });
});

describe("hasOptionalDetailInput", () => {
  it("任意項目が空なら false", () => {
    expect(hasOptionalDetailInput(makeForm())).toBe(false);
  });

  it("空白だけのメモは入力とみなさない", () => {
    expect(hasOptionalDetailInput(makeForm({ note: "   " }))).toBe(false);
  });

  it("いずれかの任意項目が入っていれば true", () => {
    expect(hasOptionalDetailInput(makeForm({ sleepStart: "23:30" }))).toBe(true);
    expect(hasOptionalDetailInput(makeForm({ medication: "done" }))).toBe(true);
    expect(hasOptionalDetailInput(makeForm({ note: "少し歩いた" }))).toBe(true);
    expect(
      hasOptionalDetailInput(
        makeForm({
          moodLabels: [{ label: "安心", category: "ポジティブ", isCustom: false }],
        })
      )
    ).toBe(true);
  });
});

describe("hasWarningInput", () => {
  it("サインが空なら false", () => {
    expect(hasWarningInput(makeForm())).toBe(false);
  });

  it("「なし」を選んだ状態も入力として扱う", () => {
    expect(hasWarningInput(makeForm({ warningLevel: "none" }))).toBe(true);
  });

  it("タグや自由記述だけでも入力として扱う", () => {
    expect(hasWarningInput(makeForm({ warningTags: ["眠れない"] }))).toBe(true);
    expect(hasWarningInput(makeForm({ warningNote: "頭痛" }))).toBe(true);
  });
});

describe("shouldRevealFollowUps", () => {
  it("何も入っていなければ入口だけを見せる", () => {
    expect(shouldRevealFollowUps(makeForm())).toBe(false);
  });

  it("入口を選んだら追加の項目を見せる", () => {
    expect(shouldRevealFollowUps(makeForm({ moodScore: 3 }))).toBe(true);
  });

  it("入口が未選択でも、すでに書いてある記録は隠さない", () => {
    expect(shouldRevealFollowUps(makeForm({ sleepEnd: "07:00" }))).toBe(true);
    expect(shouldRevealFollowUps(makeForm({ selfCareIds: ["s1"] }))).toBe(true);
    expect(shouldRevealFollowUps(makeForm({ selfCareMemo: "散歩" }))).toBe(true);
    expect(shouldRevealFollowUps(makeForm({ warningTags: ["涙が出る"] }))).toBe(
      true
    );
  });
});
