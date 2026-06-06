import { describe, expect, it } from "vitest";
import {
  buildRecordSummaryLines,
  formatSleepSummary,
  getMoodLabel,
  isMeaningfulSummaryValue,
} from "./format";
import type { DailyRecord } from "./types";

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    id: "r1",
    date: "2026-01-05",
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
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("isMeaningfulSummaryValue", () => {
  it("空・未入力系は意味なし", () => {
    expect(isMeaningfulSummaryValue("")).toBe(false);
    expect(isMeaningfulSummaryValue("まだ入力していません")).toBe(false);
    expect(isMeaningfulSummaryValue("—")).toBe(false);
  });

  it("通常の値は意味あり", () => {
    expect(isMeaningfulSummaryValue("8時間")).toBe(true);
  });
});

describe("getMoodLabel", () => {
  it("スコアに対応するラベル", () => {
    expect(getMoodLabel(5)).toBe("かなり良い");
    expect(getMoodLabel(1)).toBe("かなりしんどい");
  });

  it("null は未入力文言", () => {
    expect(getMoodLabel(null)).toBe("まだ入力していません");
  });
});

describe("formatSleepSummary", () => {
  it("両方の時刻があれば範囲と長さ", () => {
    const record = makeRecord({
      sleepStart: "23:00",
      sleepEnd: "07:00",
      sleepMinutes: 480,
    });
    expect(formatSleepSummary(record)).toBe("23:00〜07:00（8時間）");
  });

  it("片方だけなら未入力扱い", () => {
    expect(formatSleepSummary(makeRecord({ sleepStart: "23:00" }))).toBe(
      "まだ入力していません"
    );
  });
});

describe("buildRecordSummaryLines", () => {
  it("意味のある行だけを返す（空の記録は気分なども除外）", () => {
    const lines = buildRecordSummaryLines(makeRecord(), []);
    expect(lines).toHaveLength(0);
  });

  it("入力済みの項目を行として返す", () => {
    const record = makeRecord({ moodScore: 4 });
    const lines = buildRecordSummaryLines(record, []);
    expect(lines).toContainEqual({ label: "気分", value: "まあまあ良い" });
  });
});
