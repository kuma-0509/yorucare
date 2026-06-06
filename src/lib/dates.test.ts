import { describe, expect, it } from "vitest";
import {
  formatChartMonthLabel,
  getDateRangeForPeriod,
  getLast7Days,
  getMonthRangeForPeriod,
  isMonthlyChartPeriod,
  toDateString,
  toMonthKey,
} from "./dates";

describe("toDateString", () => {
  it("ローカル日付を YYYY-MM-DD に整形（ゼロ埋め）", () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateString(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("getLast7Days", () => {
  it("今日を含む7日分・古い順・末尾が今日", () => {
    const days = getLast7Days();
    expect(days).toHaveLength(7);
    expect(days[6]).toBe(toDateString(new Date()));
    // 昇順であること
    const sorted = [...days].sort();
    expect(days).toEqual(sorted);
  });
});

describe("getDateRangeForPeriod", () => {
  it("週は7日、月は30日", () => {
    expect(getDateRangeForPeriod("week")).toHaveLength(7);
    expect(getDateRangeForPeriod("month")).toHaveLength(30);
  });
});

describe("getMonthRangeForPeriod", () => {
  it("6ヶ月は6件、年は12件", () => {
    expect(getMonthRangeForPeriod("6months")).toHaveLength(6);
    expect(getMonthRangeForPeriod("year")).toHaveLength(12);
  });

  it("週・月は空配列", () => {
    expect(getMonthRangeForPeriod("week")).toHaveLength(0);
    expect(getMonthRangeForPeriod("month")).toHaveLength(0);
  });
});

describe("isMonthlyChartPeriod", () => {
  it("6ヶ月・年のみ月次", () => {
    expect(isMonthlyChartPeriod("6months")).toBe(true);
    expect(isMonthlyChartPeriod("year")).toBe(true);
    expect(isMonthlyChartPeriod("week")).toBe(false);
    expect(isMonthlyChartPeriod("month")).toBe(false);
  });
});

describe("toMonthKey / formatChartMonthLabel", () => {
  it("月キーと表示ラベル", () => {
    expect(toMonthKey(new Date(2026, 2, 1))).toBe("2026-03");
    expect(formatChartMonthLabel("2026-03")).toBe("3月");
  });
});
