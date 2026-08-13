import { describe, expect, it } from "vitest";
import {
  MIN_DAYS_FOR_COMPARISON,
  relateSelfCareToMood,
} from "./self-care-relation";
import type { DailyRecord, MoodScore, SelfCareItem } from "../types";

const selfCareItems: SelfCareItem[] = [
  {
    id: "s1",
    title: "深呼吸",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

function makeRecord(
  date: string,
  moodScore: MoodScore | null,
  selfCareIds: string[],
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    id: date,
    date,
    moodScore,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    sleepMinutes: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds,
    selfCareMemo: "",
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

describe("relateSelfCareToMood", () => {
  it("実行日と非実行日の平均と差分を返す", () => {
    const result = relateSelfCareToMood(
      [
        makeRecord("2026-07-21", 4, ["s1"]),
        makeRecord("2026-07-22", 4, ["s1"]),
        makeRecord("2026-07-23", 5, ["s1"]),
        makeRecord("2026-07-24", 2, []),
        makeRecord("2026-07-25", 3, []),
        makeRecord("2026-07-26", 2, []),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-26"
    );

    const relation = result.relations[0];
    expect(relation.name).toBe("深呼吸");
    expect(relation.daysDone).toBe(3);
    expect(relation.daysNotDone).toBe(3);
    expect(relation.averageMoodOnDoneDays).toBe(4.3);
    expect(relation.averageMoodOnOtherDays).toBe(2.3);
    expect(relation.differenceInAverage).toBe(2);
  });

  it("片側の日数が足りなければ差分を null にする", () => {
    const result = relateSelfCareToMood(
      [
        makeRecord("2026-07-21", 5, ["s1"]),
        makeRecord("2026-07-22", 2, []),
        makeRecord("2026-07-23", 2, []),
        makeRecord("2026-07-24", 2, []),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-24"
    );

    const relation = result.relations[0];
    // 実行日が1日しかない差を傾向として読ませない
    expect(relation.daysDone).toBe(1);
    expect(relation.averageMoodOnDoneDays).toBe(5);
    expect(relation.differenceInAverage).toBeNull();
    expect(result.minDaysForComparison).toBe(MIN_DAYS_FOR_COMPARISON);
  });

  it("記録がない日を非実行日に数えない", () => {
    const result = relateSelfCareToMood(
      [makeRecord("2026-07-21", 4, ["s1"])],
      selfCareItems,
      "2026-07-21",
      "2026-07-27"
    );

    // 記録がない6日を「セルフケアをしなかった日」にしない
    expect(result.relations[0].daysNotDone).toBe(0);
    expect(result.recordedDays).toBe(1);
  });

  it("警告サインが yes だった日数を実行有無ごとに返す", () => {
    const result = relateSelfCareToMood(
      [
        makeRecord("2026-07-21", 3, ["s1"], { warningLevel: "yes" }),
        makeRecord("2026-07-22", 3, [], { warningLevel: "yes" }),
        makeRecord("2026-07-23", 3, [], { warningLevel: "yes" }),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-23"
    );

    expect(result.relations[0].warningYesOnDoneDays).toBe(1);
    expect(result.relations[0].warningYesOnOtherDays).toBe(2);
  });

  it("moodScore が未入力の日は平均に含めない", () => {
    const result = relateSelfCareToMood(
      [
        makeRecord("2026-07-21", null, ["s1"]),
        makeRecord("2026-07-22", 4, ["s1"]),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-22"
    );

    expect(result.relations[0].daysDone).toBe(2);
    expect(result.relations[0].averageMoodOnDoneDays).toBe(4);
  });

  it("記録が1件もなければ平均も差分も null になる", () => {
    const result = relateSelfCareToMood([], selfCareItems, "2026-07-21", "2026-07-27");

    const relation = result.relations[0];
    expect(relation.averageMoodOnDoneDays).toBeNull();
    expect(relation.averageMoodOnOtherDays).toBeNull();
    expect(relation.differenceInAverage).toBeNull();
  });

  it("戻り値のキーに効果を意味する語を使わない", () => {
    const result = relateSelfCareToMood(
      [makeRecord("2026-07-21", 4, ["s1"])],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    // LLMは渡された言葉に引きずられ、相関を因果として断定する
    const keys = Object.keys(result.relations[0]).join(",").toLowerCase();
    expect(keys).not.toContain("effect");
    expect(keys).not.toContain("impact");
    expect(keys).not.toContain("improve");
  });
});
