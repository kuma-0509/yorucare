import { describe, expect, it } from "vitest";
import { buildDailyViews } from "./daily-view";
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
    note: "",
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

describe("buildDailyViews", () => {
  it("記録がない日も recorded: false として返す", () => {
    const views = buildDailyViews(
      [makeRecord({ date: "2026-07-22" })],
      selfCareItems,
      "2026-07-21",
      "2026-07-23"
    );

    expect(views.map((v) => v.date)).toEqual([
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
    ]);
    expect(views.map((v) => v.recorded)).toEqual([false, true, false]);
  });

  it("メモ本文を返さず、あったかどうかだけを返す", () => {
    const views = buildDailyViews(
      [
        makeRecord({
          date: "2026-07-21",
          note: "自由記述の内容",
          warningNote: "警告のメモ",
          selfCareMemo: "セルフケアのメモ",
        }),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    expect(views[0].hasMemo).toBe(true);
    const serialized = JSON.stringify(views);
    expect(serialized).not.toContain("自由記述の内容");
    expect(serialized).not.toContain("警告のメモ");
    expect(serialized).not.toContain("セルフケアのメモ");
  });

  it("メモが1つもなければ hasMemo が false になる", () => {
    const views = buildDailyViews(
      [makeRecord({ date: "2026-07-21" })],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    expect(views[0].hasMemo).toBe(false);
  });

  it("selfCareIds をタイトルへ解決する", () => {
    const views = buildDailyViews(
      [makeRecord({ date: "2026-07-21", selfCareIds: ["s1"] })],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    expect(views[0].selfCareTitles).toEqual(["深呼吸"]);
  });

  it("辞書から消えた項目は除く", () => {
    const views = buildDailyViews(
      [makeRecord({ date: "2026-07-21", selfCareIds: ["s1", "deleted"] })],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    expect(views[0].selfCareTitles).toEqual(["深呼吸"]);
  });

  it("moodLabels をラベル名の配列にする", () => {
    const views = buildDailyViews(
      [
        makeRecord({
          date: "2026-07-21",
          moodLabels: [{ label: "つかれた", category: "ネガティブ", isCustom: false }],
        }),
      ],
      selfCareItems,
      "2026-07-21",
      "2026-07-21"
    );

    expect(views[0].moodLabels).toEqual(["つかれた"]);
  });
});
