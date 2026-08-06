import { describe, expect, it } from "vitest";
import { buildAiShareText } from "./ai-share-text";
import { detectChanges } from "./ai/detect-changes";
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
    note: "自由記述の内容",
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

describe("相談文への追加項目", () => {
  const records = [
    makeRecord({ date: "2026-07-21", moodScore: 2, sleepMinutes: 300 }),
    makeRecord({ id: "r2", date: "2026-07-22", moodScore: 1, sleepMinutes: 320 }),
  ];

  const facts = detectChanges(records, "2026-07-21", "2026-07-22").facts;

  it("渡さなければ、これまでどおりの出力のままにする", () => {
    const result = buildAiShareText({
      records,
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-22",
      fields: ["mood"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).not.toContain("【記録から数えた事実】");
    expect(result.text).not.toContain("【本人が見た相談先】");
  });

  it("事実を渡すと、母数つきで本文へ入る", () => {
    const result = buildAiShareText({
      records,
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-22",
      fields: ["mood"],
      changeFacts: facts,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("【記録から数えた事実】");
    expect(result.text).toContain("日分");
    expect(result.text).toContain("診断ではなく、本人の記録の集計です。");
  });

  it("本人が選んだ相談先の名称だけを入れる", () => {
    const result = buildAiShareText({
      records,
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-22",
      fields: ["mood"],
      referencedSupportNames: ["こころの健康相談（デモ）"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("【本人が見た相談先】");
    expect(result.text).toContain("こころの健康相談（デモ）");
  });

  it("追加項目の経路にメモ本文を通さない", () => {
    const result = buildAiShareText({
      records,
      selfCareItems,
      startDate: "2026-07-21",
      endDate: "2026-07-22",
      // メモを含む項目は選ばない
      fields: ["mood"],
      changeFacts: facts,
      referencedSupportNames: ["こころの健康相談（デモ）"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).not.toContain("自由記述の内容");
    expect(result.text).not.toContain("早めに休む");
    expect(result.text).not.toContain("少し楽になった");
  });
});
