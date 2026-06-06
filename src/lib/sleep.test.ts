import { describe, expect, it } from "vitest";
import { calculateSleepMinutes, formatSleepDuration } from "./sleep";

describe("calculateSleepMinutes", () => {
  it("同日内の睡眠時間を分で返す", () => {
    expect(calculateSleepMinutes("13:00", "14:30")).toBe(90);
  });

  it("日付をまたぐ睡眠（夜→朝）を正しく計算する", () => {
    // 23:00 -> 07:00 = 8時間
    expect(calculateSleepMinutes("23:00", "07:00")).toBe(8 * 60);
  });

  it("開始と終了が同じ場合は24時間扱い（またぎ）", () => {
    expect(calculateSleepMinutes("22:00", "22:00")).toBe(24 * 60);
  });

  it("どちらかが未入力なら null", () => {
    expect(calculateSleepMinutes(null, "07:00")).toBeNull();
    expect(calculateSleepMinutes("23:00", null)).toBeNull();
  });

  it("不正な時刻は null", () => {
    expect(calculateSleepMinutes("25:00", "07:00")).toBeNull();
    expect(calculateSleepMinutes("23:00", "07:99")).toBeNull();
    expect(calculateSleepMinutes("abc", "07:00")).toBeNull();
  });
});

describe("formatSleepDuration", () => {
  it("分なしの時間は『N時間』", () => {
    expect(formatSleepDuration(480)).toBe("8時間");
  });

  it("分ありは『N時間M分』", () => {
    expect(formatSleepDuration(490)).toBe("8時間10分");
  });

  it("null は未入力文言", () => {
    expect(formatSleepDuration(null)).toBe("まだ入力していません");
  });
});
