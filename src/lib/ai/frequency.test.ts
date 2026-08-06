import { describe, expect, it } from "vitest";
import { getSelfCareDictionary, listSelfCare, listWarningTags } from "./frequency";
import type { DailyRecord, SelfCareItem } from "../types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-07-21",
    moodScore: 4,
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
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

const selfCareItems: SelfCareItem[] = [
  {
    id: "s1",
    title: "深呼吸",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "s2",
    title: "散歩",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

describe("listWarningTags", () => {
  it("日数の多い順に並べ、母数を返す", () => {
    const result = listWarningTags(
      [
        makeRecord({ id: "a", date: "2026-07-21", warningTags: ["疲れ", "頭痛"] }),
        makeRecord({ id: "b", date: "2026-07-22", warningTags: ["疲れ"] }),
        makeRecord({ id: "c", date: "2026-07-23", warningTags: [] }),
      ],
      "2026-07-21",
      "2026-07-23"
    );

    expect(result.entries).toEqual([
      { name: "疲れ", days: 2 },
      { name: "頭痛", days: 1 },
    ]);
    expect(result.recordedDays).toBe(3);
  });

  it("同じ日に同じタグが重複しても1日として数える", () => {
    const result = listWarningTags(
      [makeRecord({ date: "2026-07-21", warningTags: ["疲れ", "疲れ"] })],
      "2026-07-21",
      "2026-07-21"
    );

    expect(result.entries).toEqual([{ name: "疲れ", days: 1 }]);
  });

  it("期間外の記録を数えない", () => {
    const result = listWarningTags(
      [
        makeRecord({ id: "a", date: "2026-07-20", warningTags: ["疲れ"] }),
        makeRecord({ id: "b", date: "2026-07-21", warningTags: ["頭痛"] }),
      ],
      "2026-07-21",
      "2026-07-21"
    );

    expect(result.entries).toEqual([{ name: "頭痛", days: 1 }]);
  });

  it("同数のときは入力順によらず同じ並びになる", () => {
    // 並びが入力順で変わるとLLMの出力もぶれるため、名前順で固定する
    const forward = listWarningTags(
      [makeRecord({ date: "2026-07-21", warningTags: ["頭痛", "疲れ", "不安"] })],
      "2026-07-21",
      "2026-07-21"
    );
    const reversed = listWarningTags(
      [makeRecord({ date: "2026-07-21", warningTags: ["不安", "疲れ", "頭痛"] })],
      "2026-07-21",
      "2026-07-21"
    );

    expect(forward.entries).toEqual(reversed.entries);
    expect(forward.entries.map((e) => e.days)).toEqual([1, 1, 1]);
  });
});

describe("listSelfCare", () => {
  it("IDをタイトルへ解決して頻度順に返す", () => {
    const result = listSelfCare(
      [
        makeRecord({ id: "a", date: "2026-07-21", selfCareIds: ["s1", "s2"] }),
        makeRecord({ id: "b", date: "2026-07-22", selfCareIds: ["s1"] }),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-22"
    );

    expect(result.entries).toEqual([
      { name: "深呼吸", days: 2 },
      { name: "散歩", days: 1 },
    ]);
  });

  it("辞書から消えた項目は除く", () => {
    const result = listSelfCare(
      [makeRecord({ date: "2026-07-21", selfCareIds: ["s1", "deleted"] })],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    expect(result.entries).toEqual([{ name: "深呼吸", days: 1 }]);
  });
});

describe("getSelfCareDictionary", () => {
  it("登録されたタイトルを返す", () => {
    expect(getSelfCareDictionary(selfCareItems)).toEqual(["深呼吸", "散歩"]);
  });
});
