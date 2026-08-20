import { describe, expect, it } from "vitest";
import {
  SLEEP_END_QUICK_OPTIONS,
  SLEEP_START_QUICK_OPTIONS,
  buildTimeOptions,
  calculateSleepMinutes,
  formatMinutesToTime,
  formatSleepDuration,
  parseTimeToMinutes,
  shiftTime,
} from "./sleep";

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

describe("buildTimeOptions", () => {
  it("刻みごとの HH:mm を、終わりの時刻を含めて並べる", () => {
    expect(buildTimeOptions("05:00", "06:00", 30)).toEqual([
      "05:00",
      "05:30",
      "06:00",
    ]);
  });

  it("終わりが始まりより前なら、日をまたぐ範囲として並べる", () => {
    expect(buildTimeOptions("23:00", "01:00", 60)).toEqual([
      "23:00",
      "00:00",
      "01:00",
    ]);
  });

  it("不正な時刻や刻みなら空の一覧を返す", () => {
    expect(buildTimeOptions("25:00", "06:00", 30)).toEqual([]);
    expect(buildTimeOptions("05:00", "06:00", 0)).toEqual([]);
  });
});

describe("クイック選択の候補", () => {
  it("寝た時間は夜から深夜まで、起きた時間は朝を並べる", () => {
    expect(SLEEP_START_QUICK_OPTIONS[0]).toBe("21:00");
    expect(SLEEP_START_QUICK_OPTIONS.at(-1)).toBe("02:00");
    expect(SLEEP_END_QUICK_OPTIONS[0]).toBe("05:00");
    expect(SLEEP_END_QUICK_OPTIONS.at(-1)).toBe("10:00");
  });

  it("候補はすべて睡眠時間の計算がそのまま通る値になっている", () => {
    for (const option of [
      ...SLEEP_START_QUICK_OPTIONS,
      ...SLEEP_END_QUICK_OPTIONS,
    ]) {
      expect(option).toMatch(/^\d{2}:\d{2}$/);
      expect(calculateSleepMinutes(option, "07:00")).not.toBeNull();
    }
  });
});

describe("shiftTime", () => {
  it("刻みの目盛りに合わせて前後へずらす", () => {
    expect(shiftTime("22:00", 5)).toBe("22:05");
    expect(shiftTime("22:00", -5)).toBe("21:55");
  });

  it("目盛りから外れた時刻は、ずらす向きの目盛りへ丸める", () => {
    expect(shiftTime("22:03", 5)).toBe("22:05");
    expect(shiftTime("22:03", -5)).toBe("22:00");
  });

  it("日をまたぐときは折り返す", () => {
    expect(shiftTime("23:58", 5)).toBe("00:00");
    expect(shiftTime("00:00", -5)).toBe("23:55");
  });

  it("未入力や不正な時刻なら null", () => {
    expect(shiftTime(null, 5)).toBeNull();
    expect(shiftTime("", 5)).toBeNull();
    expect(shiftTime("24:00", 5)).toBeNull();
  });
});

describe("parseTimeToMinutes / formatMinutesToTime", () => {
  it("HH:mm と分を行き来できる", () => {
    expect(parseTimeToMinutes("07:30")).toBe(450);
    expect(formatMinutesToTime(450)).toBe("07:30");
  });

  it("24時間を超えた分は翌日の時刻として折り返す", () => {
    expect(formatMinutesToTime(24 * 60 + 90)).toBe("01:30");
    expect(formatMinutesToTime(-30)).toBe("23:30");
  });

  it("範囲外の時刻は null", () => {
    expect(parseTimeToMinutes("23:60")).toBeNull();
    expect(parseTimeToMinutes("7:3o")).toBeNull();
  });
});
