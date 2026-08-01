import { describe, expect, it } from "vitest";
import { countDaysInRange, enumerateDates, isDateInRange, MAX_RANGE_DAYS } from "./range";

describe("isDateInRange", () => {
  it("両端を含む", () => {
    expect(isDateInRange("2026-07-21", "2026-07-21", "2026-07-23")).toBe(true);
    expect(isDateInRange("2026-07-23", "2026-07-21", "2026-07-23")).toBe(true);
    expect(isDateInRange("2026-07-20", "2026-07-21", "2026-07-23")).toBe(false);
    expect(isDateInRange("2026-07-24", "2026-07-21", "2026-07-23")).toBe(false);
  });
});

describe("countDaysInRange", () => {
  it("両端を含めて数える", () => {
    expect(countDaysInRange("2026-07-21", "2026-07-27")).toBe(7);
    expect(countDaysInRange("2026-07-21", "2026-07-21")).toBe(1);
  });

  it("月またぎと閏年を正しく数える", () => {
    expect(countDaysInRange("2026-07-30", "2026-08-02")).toBe(4);
    expect(countDaysInRange("2028-02-27", "2028-03-01")).toBe(4);
  });

  it("範囲が逆または不正なら0を返す", () => {
    expect(countDaysInRange("2026-07-27", "2026-07-21")).toBe(0);
    expect(countDaysInRange("不正な日付", "2026-07-21")).toBe(0);
  });
});

describe("enumerateDates", () => {
  it("1日ずつ並べる", () => {
    expect(enumerateDates("2026-07-30", "2026-08-02")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  it("範囲が不正なら空を返す", () => {
    expect(enumerateDates("2026-07-27", "2026-07-21")).toEqual([]);
  });

  it("上限を超える範囲は空を返す", () => {
    // 想定は最長でも数年分。桁違いの指定は誤りとして扱う
    expect(enumerateDates("1900-01-01", "2026-07-21").length).toBe(0);
    expect(MAX_RANGE_DAYS).toBeGreaterThan(365 * 10);
  });
});
