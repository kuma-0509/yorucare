import { describe, expect, it } from "vitest";
import { buildWeeklySummary, buildWeeklySummaryText } from "./weekly-summary";
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
  overrides: Partial<DailyRecord> = {}
): DailyRecord {
  return {
    id: date,
    date,
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
    goal: "",
    goalResult: null,
    goalReviewedText: "",
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
    ...overrides,
  };
}

const FROM = "2026-07-21";
const TO = "2026-07-27";

function lineById(records: DailyRecord[], id: string) {
  const summary = buildWeeklySummary(records, selfCareItems, FROM, TO);
  return summary.lines.find((line) => line.id === id);
}

describe("buildWeeklySummary の空状態", () => {
  it("記録が1件もなければ isEmpty を立てる", () => {
    const summary = buildWeeklySummary([], selfCareItems, FROM, TO);

    expect(summary.isEmpty).toBe(true);
    expect(summary.recordedDays).toBe(0);
    expect(summary.lines).toEqual([]);
    expect(summary.highlights).toEqual([]);
  });

  it("空状態でも次に書くときの負担を下げる一文を添える", () => {
    const summary = buildWeeklySummary([], selfCareItems, FROM, TO);

    expect(summary.headline).toContain("1日分からで大丈夫です");
  });
});

describe("buildWeeklySummary の見出し", () => {
  it("記録が一部の日だけでも、書けなかった日を数えない", () => {
    const summary = buildWeeklySummary(
      [makeRecord("2026-07-21"), makeRecord("2026-07-23")],
      selfCareItems,
      FROM,
      TO
    );

    expect(summary.headline).toBe("この7日間で、2日分の記録が残りました。");
    // 「7日中2日」「5日は記録がありません」といった書き方をしない
    expect(summary.headline).not.toContain("7日中");
    expect(summary.headline).not.toContain("しか");
    expect(summary.headline).not.toContain("ありません");
  });

  it("毎日記録できた週はそのまま伝える", () => {
    const records = [
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
      "2026-07-27",
    ].map((date) => makeRecord(date));

    const summary = buildWeeklySummary(records, selfCareItems, FROM, TO);

    expect(summary.headline).toBe("この7日間、毎日記録できています。");
  });
});

describe("buildWeeklySummary の各項目", () => {
  it("気分は平均に母数と幅を添える", () => {
    const line = lineById(
      [
        makeRecord("2026-07-21", { moodScore: 2 }),
        makeRecord("2026-07-22", { moodScore: 4 }),
      ],
      "mood"
    );

    expect(line?.value).toBe("平均 3（5段階）");
    expect(line?.note).toBe("記録した2日分・2〜4の幅");
  });

  it("睡眠時間を時間と分に整えて母数を添える", () => {
    const line = lineById(
      [
        makeRecord("2026-07-21", { sleepMinutes: 430 }),
        makeRecord("2026-07-22", { sleepMinutes: 430 }),
      ],
      "sleep-duration"
    );

    expect(line?.value).toBe("平均 7時間10分");
    expect(line?.note).toContain("記録した2日分");
  });

  it("就寝時刻を中央値として示す", () => {
    const line = lineById(
      [
        makeRecord("2026-07-21", { sleepStart: "23:00" }),
        makeRecord("2026-07-22", { sleepStart: "01:00" }),
        makeRecord("2026-07-23", { sleepStart: "00:00" }),
      ],
      "bedtime"
    );

    expect(line?.value).toBe("だいたい 00:00 ごろ");
  });

  it("服薬は割合ではなく日数で示す", () => {
    const line = lineById(
      [
        makeRecord("2026-07-21", { medication: "done" }),
        makeRecord("2026-07-22", { medication: "forgot" }),
        makeRecord("2026-07-23", { medication: "done" }),
      ],
      "medication"
    );

    // 達成率にすると、できなかった側が強調される
    expect(line?.value).toBe("できた 2日");
    expect(line?.value).not.toContain("%");
    expect(line?.note).toBe("服薬について答えた3日分");
  });

  it("忘れた日数を項目として並べない", () => {
    const line = lineById(
      [
        makeRecord("2026-07-21", { medication: "forgot" }),
        makeRecord("2026-07-22", { medication: "forgot" }),
      ],
      "medication"
    );

    expect(line?.value).toBe("できた 0日");
    expect(line?.value).not.toContain("忘れ");
  });

  it("しんどさのサインを段階ごとの日数で示す", () => {
    const line = lineById(
      [
        makeRecord("2026-07-21", { warningLevel: "yes" }),
        makeRecord("2026-07-22", { warningLevel: "none" }),
      ],
      "warning"
    );

    expect(line?.value).toBe("あり 1日・なし 1日");
  });

  it("連続して記録できた日数は2日以上のときだけ出す", () => {
    const single = lineById([makeRecord("2026-07-21")], "streak");
    expect(single).toBeUndefined();

    const twoDays = lineById(
      [makeRecord("2026-07-21"), makeRecord("2026-07-22")],
      "streak"
    );
    expect(twoDays?.value).toBe("最長 2日");
  });

  it("未入力の項目は行として並べない", () => {
    const summary = buildWeeklySummary(
      [makeRecord("2026-07-21", { moodScore: null })],
      selfCareItems,
      FROM,
      TO
    );

    expect(summary.lines).toEqual([]);
    expect(summary.isEmpty).toBe(false);
  });
});

describe("buildWeeklySummary の注目点", () => {
  it("よく選んだサインとよく実行したことを頻度順に出す", () => {
    const summary = buildWeeklySummary(
      [
        makeRecord("2026-07-21", { warningTags: ["疲れ"], selfCareIds: ["s1"] }),
        makeRecord("2026-07-22", { warningTags: ["疲れ"] }),
      ],
      selfCareItems,
      FROM,
      TO
    );

    expect(summary.highlights).toEqual([
      { id: "warning-tags", label: "よく選んだサイン", items: ["疲れ（2日）"] },
      { id: "self-care", label: "よく実行したこと", items: ["深呼吸（1日）"] },
    ]);
  });

  it("上位3件までに絞る", () => {
    const summary = buildWeeklySummary(
      [makeRecord("2026-07-21", { warningTags: ["a", "b", "c", "d"] })],
      selfCareItems,
      FROM,
      TO
    );

    expect(summary.highlights[0].items).toHaveLength(3);
  });
});

describe("表現の制約", () => {
  const rich = [
    makeRecord("2026-07-21", {
      moodScore: 1 as MoodScore,
      sleepMinutes: 200,
      sleepStart: "03:00",
      medication: "forgot",
      warningLevel: "yes",
      warningTags: ["疲れ"],
    }),
    makeRecord("2026-07-22", {
      moodScore: 2 as MoodScore,
      sleepMinutes: 240,
      medication: "forgot",
      warningLevel: "yes",
    }),
  ];

  it("評価語も助言も出さない", () => {
    const summary = buildWeeklySummary(rich, selfCareItems, FROM, TO);
    const text = JSON.stringify(summary);

    // 体調が悪い日ほど、断定的な言葉と助言は本人の負担になる
    for (const word of [
      "改善",
      "悪化",
      "良くない",
      "悪い",
      "しましょう",
      "してください",
      "すべき",
      "頑張",
    ]) {
      expect(text).not.toContain(word);
    }
  });

  it("記録がない日を失敗として扱う言葉を出さない", () => {
    const summary = buildWeeklySummary(rich, selfCareItems, FROM, TO);
    const text = JSON.stringify(summary);

    for (const word of ["抜け", "未達", "達成率", "サボ", "できていません"]) {
      expect(text).not.toContain(word);
    }
  });

  it("数値を出す行には必ず母数を添える", () => {
    const summary = buildWeeklySummary(rich, selfCareItems, FROM, TO);

    // 連続日数は母数の概念がないため対象外
    const needsDenominator = summary.lines.filter((line) => line.id !== "streak");
    expect(needsDenominator.length).toBeGreaterThan(0);
    for (const line of needsDenominator) {
      expect(line.note).toBeTruthy();
    }
  });
});

describe("buildWeeklySummaryText", () => {
  it("期間と見出しと各項目を含める", () => {
    const summary = buildWeeklySummary(
      [makeRecord("2026-07-21", { moodScore: 3 })],
      selfCareItems,
      FROM,
      TO
    );
    const text = buildWeeklySummaryText(summary);

    expect(text).toContain("ヨルケア 週のまとめ");
    expect(text).toContain("期間: 2026-07-21 〜 2026-07-27");
    expect(text).toContain(summary.headline);
    expect(text).toContain("気分: 平均 3（5段階）（記録した1日分・3〜3の幅）");
  });

  it("診断や治療の判断に使えない旨を必ず添える", () => {
    const summary = buildWeeklySummary([], selfCareItems, FROM, TO);
    const text = buildWeeklySummaryText(summary);

    expect(text).toContain("診断や治療の判断には使えません");
  });

  it("メモ本文を含めない", () => {
    const summary = buildWeeklySummary(
      [
        makeRecord("2026-07-21", {
          note: "自由記述の内容",
          warningNote: "警告のメモ",
          selfCareMemo: "セルフケアのメモ",
        }),
      ],
      selfCareItems,
      FROM,
      TO
    );
    const text = buildWeeklySummaryText(summary);

    expect(text).not.toContain("自由記述の内容");
    expect(text).not.toContain("警告のメモ");
    expect(text).not.toContain("セルフケアのメモ");
  });
});
