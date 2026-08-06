import { describe, expect, it } from "vitest";
import { CHANGE_THRESHOLDS } from "./change-thresholds";
import { detectChanges, formatChangeFactLine } from "./detect-changes";
import type { DailyRecord } from "../types";

function makeRecord(
  date: string,
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    id: date,
    date,
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
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

const FROM = "2026-07-01";
const TO = "2026-07-07";

describe("母数がない項目", () => {
  it("記録が1件もなければ、すべての項目を null にする", () => {
    const result = detectChanges([], FROM, TO);

    expect(result.isEmpty).toBe(true);
    expect(result.recordedDays).toBe(0);
    expect(result.metrics.lowMoodDays).toBeNull();
    expect(result.metrics.sleepMedian).toBeNull();
    expect(result.metrics.shortSleepDays).toBeNull();
    expect(result.metrics.medicationForgotDays).toBeNull();
    expect(result.metrics.warningDays).toBeNull();
    expect(result.metrics.topWarningTag).toBeNull();
    expect(result.facts).toEqual([]);
  });

  it("答えた日がない項目は 0 ではなく null を返す（「値が低い」と区別する）", () => {
    // 気分だけ記録し、睡眠・服薬・サインは未入力
    const result = detectChanges(
      [makeRecord("2026-07-01", { moodScore: 4 })],
      FROM,
      TO
    );

    expect(result.metrics.lowMoodDays).toEqual({ days: 0, denominator: 1 });
    expect(result.metrics.sleepMedian).toBeNull();
    expect(result.metrics.shortSleepDays).toBeNull();
    expect(result.metrics.medicationForgotDays).toBeNull();
    expect(result.metrics.warningDays).toBeNull();
  });

  it("母数がない項目は行としても出さない", () => {
    const result = detectChanges(
      [makeRecord("2026-07-01", { moodScore: 4 })],
      FROM,
      TO
    );
    const ids = result.facts.map((fact) => fact.id);
    expect(ids).toContain("low-mood-days");
    expect(ids).not.toContain("sleep-median");
    expect(ids).not.toContain("medication-forgot-days");
  });
});

describe("数え方", () => {
  it("気分が閾値以下だった日を、記録した日数を母数にして数える", () => {
    const result = detectChanges(
      [
        makeRecord("2026-07-01", { moodScore: 1 }),
        makeRecord("2026-07-02", { moodScore: 2 }),
        makeRecord("2026-07-03", { moodScore: 2 }),
        makeRecord("2026-07-04", { moodScore: 4 }),
      ],
      FROM,
      TO
    );

    expect(result.metrics.lowMoodDays).toEqual({ days: 3, denominator: 4 });
  });

  it("睡眠時間は中央値を、記録があった日数を母数にして返す", () => {
    const result = detectChanges(
      [
        makeRecord("2026-07-01", { sleepMinutes: 300 }),
        makeRecord("2026-07-02", { sleepMinutes: 320 }),
        makeRecord("2026-07-03", { sleepMinutes: 480 }),
      ],
      FROM,
      TO
    );

    expect(result.metrics.sleepMedian).toEqual({
      minutes: 320,
      denominator: 3,
    });
    const line = result.facts.find((fact) => fact.id === "sleep-median");
    expect(line?.value).toBe("5時間20分");
    expect(line?.note).toContain("3日分");
  });

  it("お薬を「忘れた」と記録した日を、答えた日数を母数にして数える", () => {
    const result = detectChanges(
      [
        makeRecord("2026-07-01", { medication: "forgot" }),
        makeRecord("2026-07-02", { medication: "forgot" }),
        makeRecord("2026-07-03", { medication: "done" }),
      ],
      FROM,
      TO
    );

    expect(result.metrics.medicationForgotDays).toEqual({
      days: 2,
      denominator: 3,
    });
  });

  it("最も多かったしんどさのサインを返す", () => {
    const result = detectChanges(
      [
        makeRecord("2026-07-01", { warningTags: ["朝起きづらい", "眠れない"] }),
        makeRecord("2026-07-02", { warningTags: ["朝起きづらい"] }),
        makeRecord("2026-07-03", { warningTags: ["朝起きづらい"] }),
      ],
      FROM,
      TO
    );

    expect(result.metrics.topWarningTag).toEqual({
      name: "朝起きづらい",
      days: 3,
      denominator: 3,
    });
  });

  it("期間外の記録は数えない", () => {
    const result = detectChanges(
      [
        makeRecord("2026-06-30", { moodScore: 1 }),
        makeRecord("2026-07-01", { moodScore: 1 }),
        makeRecord("2026-07-08", { moodScore: 1 }),
      ],
      FROM,
      TO
    );

    expect(result.recordedDays).toBe(1);
    expect(result.metrics.lowMoodDays).toEqual({ days: 1, denominator: 1 });
  });
});

describe("表現の制約", () => {
  const records = [
    makeRecord("2026-07-01", {
      moodScore: 1,
      sleepMinutes: 280,
      medication: "forgot",
      warningLevel: "yes",
      warningTags: ["朝起きづらい"],
      note: "自由記述の内容",
      warningNote: "サインのメモ",
      selfCareMemo: "セルフケアのメモ",
    }),
    makeRecord("2026-07-02", {
      moodScore: 4,
      sleepMinutes: 420,
      medication: "done",
      warningLevel: "none",
    }),
  ];

  const allText = () => {
    const result = detectChanges(records, FROM, TO);
    return [
      result.disclaimer,
      ...result.facts.map(formatChangeFactLine),
    ].join("\n");
  };

  it("記録がなかった日を「抜けた」「できなかった」と書かない", () => {
    const text = allText();
    for (const word of [
      "抜け",
      "できなかった",
      "できていません",
      "未達",
      "サボ",
      "空白",
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it("評価語を出さない", () => {
    const text = allText();
    for (const word of ["改善", "悪化", "悪い", "良好", "異常", "重症", "順調"]) {
      expect(text).not.toContain(word);
    }
  });

  it("助言を出さない", () => {
    const text = allText();
    for (const word of [
      "しましょう",
      "ましょう",
      "すべき",
      "おすすめ",
      "必要があります",
      "したほうが",
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it("割合ではなく日数で示す", () => {
    const text = allText();
    expect(text).not.toContain("%");
    expect(text).not.toContain("率");
  });

  it("数値の行には必ず母数が付く", () => {
    const result = detectChanges(records, FROM, TO);
    expect(result.facts.length).toBeGreaterThan(0);
    for (const fact of result.facts) {
      expect(fact.note).toContain("日分");
    }
  });

  it("メモ本文を戻り値に含めない", () => {
    const serialized = JSON.stringify(detectChanges(records, FROM, TO));
    expect(serialized).not.toContain("自由記述の内容");
    expect(serialized).not.toContain("サインのメモ");
    expect(serialized).not.toContain("セルフケアのメモ");
  });

  it("診断ではないことを必ず添える", () => {
    expect(detectChanges(records, FROM, TO).disclaimer).toContain("診断ではなく");
  });
});

describe("閾値の置き場所", () => {
  it("表示に使う区切りは設定ファイルの値から作る", () => {
    const result = detectChanges(
      [makeRecord("2026-07-01", { sleepMinutes: 200 })],
      FROM,
      TO
    );
    const line = result.facts.find((fact) => fact.id === "short-sleep-days");
    // 360分 = 6時間
    expect(CHANGE_THRESHOLDS.shortSleepMinutesAtMost).toBe(360);
    expect(line?.label).toContain("6時間");
  });
});
