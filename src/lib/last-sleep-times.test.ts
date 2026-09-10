// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./constants";
import {
  clearLastSleepTimes,
  getLastSleepTimes,
  mergeLastSleepTimes,
  rememberLastSleepTimes,
} from "./last-sleep-times";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("直近の寝た時間・起きた時間", () => {
  it("未保存なら空欄を返す", () => {
    expect(getLastSleepTimes()).toEqual({
      sleepStart: null,
      sleepEnd: null,
    });
  });

  it("時刻を保存すると、次に読んだときも同じ値になる", () => {
    rememberLastSleepTimes("23:30", "07:00");

    expect(localStorage.getItem(STORAGE_KEYS.lastSleepTimes)).toContain(
      '"sleepStart":"23:30"'
    );
    expect(getLastSleepTimes()).toEqual({
      sleepStart: "23:30",
      sleepEnd: "07:00",
    });
  });

  it("片方だけの保存も残す", () => {
    rememberLastSleepTimes("22:00", null);

    expect(getLastSleepTimes()).toEqual({
      sleepStart: "22:00",
      sleepEnd: null,
    });
  });

  it("両方空欄の保存では、以前の初期値を消さない", () => {
    rememberLastSleepTimes("23:00", "07:00");
    rememberLastSleepTimes(null, null);

    expect(getLastSleepTimes()).toEqual({
      sleepStart: "23:00",
      sleepEnd: "07:00",
    });
  });

  it("壊れた値や不正な時刻は空欄へ倒す", () => {
    localStorage.setItem(STORAGE_KEYS.lastSleepTimes, "{壊れた");
    expect(getLastSleepTimes()).toEqual({
      sleepStart: null,
      sleepEnd: null,
    });

    localStorage.setItem(
      STORAGE_KEYS.lastSleepTimes,
      JSON.stringify({ sleepStart: "25:00", sleepEnd: "07:00", extra: true })
    );
    expect(getLastSleepTimes()).toEqual({
      sleepStart: null,
      sleepEnd: "07:00",
    });
  });

  it("読み書きできない環境でも例外を投げない", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(() => rememberLastSleepTimes("23:00", "07:00")).not.toThrow();
    expect(getLastSleepTimes()).toEqual({
      sleepStart: null,
      sleepEnd: null,
    });
  });

  it("消せる", () => {
    rememberLastSleepTimes("23:00", "07:00");
    clearLastSleepTimes();
    expect(localStorage.getItem(STORAGE_KEYS.lastSleepTimes)).toBeNull();
    expect(getLastSleepTimes()).toEqual({
      sleepStart: null,
      sleepEnd: null,
    });
  });

  it("空のフォームへ初期値を入れる", () => {
    rememberLastSleepTimes("01:15", "08:45");

    expect(
      mergeLastSleepTimes({
        date: "2026-09-09",
        sleepStart: null,
        sleepEnd: null,
      })
    ).toEqual({
      date: "2026-09-09",
      sleepStart: "01:15",
      sleepEnd: "08:45",
    });
  });
});
