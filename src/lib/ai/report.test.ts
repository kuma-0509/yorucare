import { describe, expect, it } from "vitest";
import { verifyNarrative } from "./narrative-guard";
import {
  buildReport,
  buildReportSkeleton,
  buildReportText,
  countSelfCareDoneDays,
  fallbackNarrative,
  REPORT_SLOT_IDS,
} from "./report";
import type { DailyRecord, SelfCareItem } from "../types";

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
    warningLevel: "none",
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  };
}

function makeItem(id: string, title: string): SelfCareItem {
  return {
    id,
    title,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

const FROM = "2026-07-21";
const TO = "2026-07-27";

describe("buildReportSkeleton", () => {
  it("暦日数と記録した日数を別々に持つ", () => {
    const skeleton = buildReportSkeleton(
      [
        makeRecord({ id: "a", date: "2026-07-21" }),
        makeRecord({ id: "b", date: "2026-07-23" }),
      ],
      [],
      FROM,
      TO
    );

    expect(skeleton.daysInRange).toBe(7);
    expect(skeleton.recordedDays).toBe(2);
    expect(skeleton.isEmpty).toBe(false);
  });

  it("数値の行に母数を添える", () => {
    const skeleton = buildReportSkeleton(
      [
        makeRecord({ id: "a", date: "2026-07-21", moodScore: 2 }),
        makeRecord({ id: "b", date: "2026-07-22", moodScore: 4 }),
      ],
      [],
      FROM,
      TO
    );

    const mood = skeleton.sections.find((section) => section.id === "mood");
    expect(mood?.facts.map((fact) => [fact.value, fact.note])).toEqual([
      ["3（5段階）", "記録した2日分"],
      ["2〜4", "記録した2日分"],
    ]);
  });

  it("記録が0日でも空状態として組み立て、責める言い方をしない", () => {
    const skeleton = buildReportSkeleton([], [], FROM, TO);

    expect(skeleton.isEmpty).toBe(true);
    expect(skeleton.sections.map((section) => section.id)).toEqual(["overview"]);
    expect(skeleton.headline).not.toContain("できていません");
    // 「記録がありません」で終わらせず、次に書くときの負担を下げる一文を添える
    expect(skeleton.headline).toContain("大丈夫です");
    expect(skeleton.sections[0].facts).toEqual([]);
  });

  it("数値がない節は節ごと省く", () => {
    const skeleton = buildReportSkeleton(
      [
        makeRecord({
          id: "a",
          date: "2026-07-21",
          moodScore: null,
          sleepMinutes: null,
        }),
      ],
      [],
      FROM,
      TO
    );

    expect(skeleton.sections.map((section) => section.id)).toEqual(["overview"]);
  });

  it("できたことがあった日が0日なら、その節を出さない", () => {
    const skeleton = buildReportSkeleton(
      [makeRecord({ id: "a", date: "2026-07-21", selfCareIds: [] })],
      [makeItem("s1", "散歩する")],
      FROM,
      TO
    );

    expect(
      skeleton.sections.some((section) => section.id === "selfCare")
    ).toBe(false);
  });

  it("できたことがあった日数を、記録があった日を母数にして数える", () => {
    const skeleton = buildReportSkeleton(
      [
        makeRecord({ id: "a", date: "2026-07-21", selfCareIds: ["s1"] }),
        makeRecord({ id: "b", date: "2026-07-22", selfCareIds: ["s1", "s2"] }),
        makeRecord({ id: "c", date: "2026-07-23", selfCareIds: [] }),
      ],
      [makeItem("s1", "散歩する"), makeItem("s2", "湯船につかる")],
      FROM,
      TO
    );

    const selfCare = skeleton.sections.find(
      (section) => section.id === "selfCare"
    );
    expect(selfCare?.facts[0].value).toBe("2日");
    expect(selfCare?.facts[0].note).toBe("記録した3日分のうち");
  });

  it("すべての節に文章の穴と、選べる候補がある", () => {
    const skeleton = buildReportSkeleton(
      [makeRecord({ id: "a", date: "2026-07-21", selfCareIds: ["s1"] })],
      [makeItem("s1", "散歩する")],
      FROM,
      TO
    );

    expect(skeleton.sections.map((section) => section.slot.id)).toEqual([
      ...REPORT_SLOT_IDS,
    ]);
    for (const section of skeleton.sections) {
      expect(section.slot.id).toBe(section.id);
      expect(section.slot.maxLength).toBeGreaterThan(0);
      // 候補が2つ以上ないと、LLM に選ばせる意味がない
      expect(section.slot.candidates.length).toBeGreaterThan(1);
      expect(fallbackNarrative(section.slot)).toBe(section.slot.candidates[0].text);
    }
  });

  it("候補の id は節の中で重複しない", () => {
    const skeleton = buildReportSkeleton(
      [makeRecord({ id: "a", date: "2026-07-21", selfCareIds: ["s1"] })],
      [makeItem("s1", "散歩する")],
      FROM,
      TO
    );

    for (const section of skeleton.sections) {
      const ids = section.slot.candidates.map((candidate) => candidate.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("穴に入り得る文は、すべて表現の制約を通る", () => {
    const skeleton = buildReportSkeleton(
      [makeRecord({ id: "a", date: "2026-07-21", selfCareIds: ["s1"] })],
      [makeItem("s1", "散歩する")],
      FROM,
      TO
    );

    // 出せる文は候補が全部なので、候補を全部通せば画面に出る文をすべて確かめたことになる
    for (const section of skeleton.sections) {
      for (const candidate of section.slot.candidates) {
        const verdict = verifyNarrative(candidate.text, section.slot.maxLength);
        expect(verdict.ok, candidate.text).toBe(true);
      }
    }
  });
});

describe("報告書に載せない項目", () => {
  const records = [
    makeRecord({
      id: "a",
      date: "2026-07-21",
      note: "誰にも見せたくないメモ本文",
      warningNote: "自由記述のサインの説明",
      selfCareMemo: "セルフケアの感想の本文",
      tomorrowGoal: "明日の目標の文面",
      warningTags: ["眠れない"],
      warningLevel: "yes",
      medication: "forgot",
      goalReviewStatus: "notDone",
      selfCareFeeling: "notFit",
      selfCareIds: ["s1"],
      moodLabels: [
        { label: "自分で書いたラベル", category: "普通", isCustom: true },
      ],
    }),
  ];
  const items = [makeItem("s1", "散歩する")];

  it("本人が書いた本文を、骨格のどこにも持たない", () => {
    const serialized = JSON.stringify(
      buildReportSkeleton(records, items, FROM, TO)
    );

    for (const text of [
      "誰にも見せたくないメモ本文",
      "自由記述のサインの説明",
      "セルフケアの感想の本文",
      "明日の目標の文面",
      "自分で書いたラベル",
    ]) {
      expect(serialized).not.toContain(text);
    }
  });

  it("共有の初期版で対象外の項目を持たない", () => {
    const skeleton = buildReportSkeleton(records, items, FROM, TO);
    const serialized = JSON.stringify(skeleton);

    // 服薬・しんどさのサイン・タグ・できることの名前は sharing-decision 5節で対象外
    for (const text of ["服薬", "お薬", "しんどさ", "サイン", "眠れない", "散歩する"]) {
      expect(serialized).not.toContain(text);
    }
    // 就寝時刻も出さない（時間量の推移だけを載せる）
    expect(serialized).not.toContain("就寝");
    expect(skeleton.sections.map((section) => section.id)).toEqual([
      "overview",
      "mood",
      "sleep",
      "selfCare",
    ]);
  });

  it("報告書テキストにも本文と対象外の項目を出さない", () => {
    const text = buildReportText(
      buildReport(buildReportSkeleton(records, items, FROM, TO))
    );

    for (const forbidden of [
      "誰にも見せたくないメモ本文",
      "自由記述のサインの説明",
      "セルフケアの感想の本文",
      "明日の目標の文面",
      "眠れない",
      "散歩する",
      "就寝",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });
});

describe("countSelfCareDoneDays", () => {
  it("辞書から消えた項目だけの日は数えない", () => {
    const days = countSelfCareDoneDays(
      [
        makeRecord({ id: "a", date: "2026-07-21", selfCareIds: ["deleted"] }),
        makeRecord({ id: "b", date: "2026-07-22", selfCareIds: ["s1"] }),
      ],
      [makeItem("s1", "散歩する")],
      FROM,
      TO
    );

    expect(days).toBe(1);
  });

  it("期間外の記録を数えない", () => {
    const days = countSelfCareDoneDays(
      [makeRecord({ id: "a", date: "2026-07-20", selfCareIds: ["s1"] })],
      [makeItem("s1", "散歩する")],
      FROM,
      TO
    );

    expect(days).toBe(0);
  });
});

describe("buildReport / buildReportText", () => {
  it("filler を使わなければ、すべての穴が定型文になる", () => {
    const report = buildReport(buildReportSkeleton([], [], FROM, TO));

    for (const section of report.sections) {
      expect(section.narrativeSource).toBe("fallback");
      expect(section.narrative).toBe(fallbackNarrative(section.slot));
    }
  });

  it("テキストに期間、見出し、文章、数値、注意書きを並べる", () => {
    const report = buildReport(
      buildReportSkeleton(
        [makeRecord({ id: "a", date: "2026-07-21", moodScore: 3 })],
        [],
        FROM,
        TO
      )
    );
    const text = buildReportText(report);

    expect(text).toContain(`期間: ${FROM} 〜 ${TO}`);
    expect(text).toContain("【対象期間】");
    expect(text).toContain("【状態の推移】");
    expect(text).toContain("記録した日数: 1日（対象の7日間のうち）");
    expect(text).toContain("気分の平均: 3（5段階）（記録した1日分）");
    expect(text).toContain("診断や治療の判断には使えません");
  });
});
