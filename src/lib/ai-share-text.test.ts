import { describe, expect, it } from "vitest";
import { buildAiShareText } from "./ai-share-text";
import type { DailyRecord, SelfCareItem } from "./types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-07-21",
    moodScore: 4,
    moodLabels: [],
    sleepStart: "23:00",
    sleepEnd: "07:00",
    sleepMinutes: 480,
    medication: "done",
    warningLevel: "small",
    warningTags: ["疲れ"],
    warningNote: "早めに休む",
    selfCareIds: ["s1"],
    selfCareMemo: "少し楽になった",
    selfCareFeeling: "good",
    note: "自由記述の内容",
    tomorrowGoal: "",
    goalReviewStatus: null,
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
];

describe("buildAiShareText", () => {
  it("本人が選んだ項目だけを日付順で出力する", () => {
    const result = buildAiShareText({
      records: [
        makeRecord({ id: "r2", date: "2026-07-22", moodScore: 3 }),
        makeRecord(),
      ],
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-22",
      fields: ["mood", "sleep"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recordCount).toBe(2);
    expect(result.text.indexOf("2026年7月21日")).toBeLessThan(
      result.text.indexOf("2026年7月22日")
    );
    expect(result.text).toContain("- 気分・状態: まあまあ良い");
    expect(result.text).toContain("- 睡眠: 23:00〜07:00（8時間）");
    expect(result.text).not.toContain("服薬:");
    expect(result.text).not.toContain("自由記述の内容");
  });

  it("センシティブな項目も選んだ場合だけ含める", () => {
    const result = buildAiShareText({
      records: [makeRecord()],
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-21",
      fields: ["medication", "warning", "selfCare", "notes"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("- 服薬:");
    expect(result.text).toContain("項目: 疲れ");
    expect(result.text).toContain("セルフケア: 深呼吸");
    expect(result.text).toContain("自由記述の内容");
  });

  it("7日を超える期間を拒否する", () => {
    const result = buildAiShareText({
      records: [makeRecord()],
      selfCareItems,
      startDate: "2026-07-01",
      endDate: "2026-07-08",
      fields: ["mood"],
    });

    expect(result).toEqual({
      ok: false,
      message: "共有できる期間は7日間までです。",
    });
  });

  it("対象期間に記録がなければ拒否する", () => {
    const result = buildAiShareText({
      records: [makeRecord()],
      selfCareItems,
      startDate: "2026-07-01",
      endDate: "2026-07-07",
      fields: ["mood"],
    });

    expect(result).toEqual({
      ok: false,
      message: "選んだ期間には共有できる記録がありません。",
    });
  });
});

describe("セルフケアの感想の扱い", () => {
  it("感想を共有テキストに出さない", () => {
    const result = buildAiShareText({
      records: [makeRecord({ selfCareFeeling: "notFit" })],
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-21",
      fields: ["selfCare"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).not.toContain("感想");
    expect(result.text).not.toContain("合わなかった");
    expect(result.text).not.toContain("やってよかった");
  });
});
