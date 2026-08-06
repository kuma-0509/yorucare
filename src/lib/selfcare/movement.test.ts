import { describe, expect, it } from "vitest";
import { suggestMovement } from "./movement";
import { MOVEMENT_OPTIONS, MOVEMENT_THRESHOLDS } from "./movement-config";
import type { DailyRecord } from "../types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "2026-07-01",
    date: "2026-07-01",
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
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("「今日は休む」の扱い", () => {
  it("どの状態でも必ず選べる", () => {
    const cases: (DailyRecord | null)[] = [
      null,
      makeRecord(),
      makeRecord({ warningLevel: "yes", moodScore: 1 }),
      makeRecord({ warningLevel: "none", moodScore: 5, sleepMinutes: 480 }),
    ];

    for (const record of cases) {
      const suggestion = suggestMovement(record);
      expect(suggestion.restOption.level).toBe(0);
      expect(suggestion.restOption.title).toBe("今日は休む");
    }
  });

  it("負担の軽い日でも、休むことを候補から外さない", () => {
    const suggestion = suggestMovement(
      makeRecord({ warningLevel: "none", moodScore: 5, sleepMinutes: 480 })
    );
    expect(suggestion.maxLevel).toBe(3);
    expect(suggestion.restOption.title).toBe("今日は休む");
  });
});

describe("負担の上限", () => {
  it("しんどさのサインが「あり」の日は、高い負担の候補を出さない", () => {
    const suggestion = suggestMovement(makeRecord({ warningLevel: "yes" }));

    expect(suggestion.maxLevel).toBe(1);
    expect(suggestion.options.every((option) => option.level <= 1)).toBe(true);
    expect(suggestion.options.map((option) => option.id)).not.toContain(
      "walking"
    );
    expect(suggestion.options.map((option) => option.id)).not.toContain(
      "indoor-stretch"
    );
  });

  it("気分が閾値以下の日も、高い負担の候補を出さない", () => {
    const suggestion = suggestMovement(
      makeRecord({ moodScore: MOVEMENT_THRESHOLDS.restingMoodAtMost })
    );
    expect(suggestion.maxLevel).toBe(1);
  });

  it("しんどさのサインが「少しあり」の日はレベル2までにする", () => {
    const suggestion = suggestMovement(makeRecord({ warningLevel: "small" }));
    expect(suggestion.maxLevel).toBe(2);
    expect(suggestion.options.every((option) => option.level <= 2)).toBe(true);
  });

  it("睡眠が短い日はレベル2までにする", () => {
    const suggestion = suggestMovement(
      makeRecord({
        sleepMinutes: MOVEMENT_THRESHOLDS.lightSleepMinutesAtMost,
        warningLevel: "none",
      })
    );
    expect(suggestion.maxLevel).toBe(2);
  });

  it("複数の条件に当てはまる日は、最も軽い上限を採用する", () => {
    const suggestion = suggestMovement(
      makeRecord({ warningLevel: "small", moodScore: 1 })
    );
    expect(suggestion.maxLevel).toBe(1);
  });

  it("記録がない日は状態を推定せず、軽い候補だけを並べる", () => {
    const suggestion = suggestMovement(null);

    expect(suggestion.hasRecord).toBe(false);
    expect(suggestion.maxLevel).toBe(
      MOVEMENT_THRESHOLDS.maxLevelWithoutRecord
    );
    expect(suggestion.basis).toEqual([]);
  });

  it("候補は負担の軽い順に並ぶ", () => {
    const suggestion = suggestMovement(
      makeRecord({ warningLevel: "none", moodScore: 4 })
    );
    const levels = suggestion.options.map((option) => option.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });
});

describe("表現の制約", () => {
  const optionText = [
    ...MOVEMENT_OPTIONS,
    suggestMovement(null).restOption,
  ]
    .map((option) => `${option.title} ${option.description}`)
    .join("\n");

  it("提案の文言に助言表現を使わない", () => {
    for (const word of [
      "しましょう",
      "ましょう",
      "すべき",
      "おすすめ",
      "必要があります",
      "したほうが",
      "してください",
    ]) {
      expect(optionText).not.toContain(word);
    }
  });

  it("提案の文言に評価語を使わない", () => {
    for (const word of ["改善", "悪化", "悪い", "異常", "重症", "頑張"]) {
      expect(optionText).not.toContain(word);
    }
  });

  it("並べ方の根拠は、記録した値そのものを述べる", () => {
    const suggestion = suggestMovement(makeRecord({ warningLevel: "yes" }));
    expect(suggestion.basis).toHaveLength(1);
    expect(suggestion.basis[0]).toContain("記録した日です");
    for (const word of ["不調", "危険", "要注意", "無理", "悪化"]) {
      expect(suggestion.basis[0]).not.toContain(word);
    }
  });

  it("体調が悪いときの中止と、医療機関への相談を必ず添える", () => {
    const cautions = suggestMovement(null).cautions.join("\n");
    expect(cautions).toContain("中止");
    expect(cautions).toContain("医療機関");
  });

  it("実施の有無を集計しないことを、戻り値に実施状態を持たないことで表す", () => {
    const suggestion = suggestMovement(makeRecord());
    const keys = Object.keys(suggestion);
    for (const forbidden of ["done", "completed", "streak", "achievementRate"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
