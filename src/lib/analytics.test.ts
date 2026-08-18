// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getRecentSaveStreakHint } from "./analytics";
import { STORAGE_KEYS } from "./constants";
import { getLast7Days, toDateString } from "./dates";

function seedRecordDays(uniqueRecordDays: string[]): void {
  localStorage.setItem(
    STORAGE_KEYS.analytics,
    JSON.stringify({
      events: [],
      metrics: {
        totalSaves: uniqueRecordDays.length,
        uniqueRecordDays,
        firstSaveAt: null,
        lastSaveAt: null,
      },
    })
  );
}

function daysAgo(count: number): string {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return toDateString(date);
}

describe("getRecentSaveStreakHint", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("直近7日の外にある記録日は数えない", () => {
    const last7Days = getLast7Days();
    seedRecordDays([daysAgo(30), daysAgo(8), last7Days[0], last7Days[3]]);

    expect(getRecentSaveStreakHint().daysRecorded).toBe(2);
  });

  it("記録がなければ0日", () => {
    seedRecordDays([]);

    expect(getRecentSaveStreakHint()).toEqual({
      daysRecorded: 0,
      savedToday: false,
    });
  });

  it("今日の記録があるかを別に返す", () => {
    seedRecordDays([daysAgo(1)]);
    expect(getRecentSaveStreakHint().savedToday).toBe(false);

    seedRecordDays([daysAgo(1), daysAgo(0)]);
    expect(getRecentSaveStreakHint()).toEqual({
      daysRecorded: 2,
      savedToday: true,
    });
  });
});
