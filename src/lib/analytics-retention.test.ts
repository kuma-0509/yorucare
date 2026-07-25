import { describe, expect, it } from "vitest";
import {
  calculateRetentionSummary,
  toJapanDate,
  type RecordActivityDay,
} from "./analytics-retention";

describe("calculateRetentionSummary", () => {
  it("calculates first-week, Week 2, and Week 4 rates for mature installs", () => {
    const rows: RecordActivityDay[] = [
      { installIdHash: "a", activityDate: "2026-06-01" },
      { installIdHash: "a", activityDate: "2026-06-03" },
      { installIdHash: "a", activityDate: "2026-06-10" },
      { installIdHash: "a", activityDate: "2026-06-24" },
      { installIdHash: "b", activityDate: "2026-06-01" },
      { installIdHash: "c", activityDate: "2026-07-20" },
      { installIdHash: "c", activityDate: "2026-07-21" },
    ];

    expect(calculateRetentionSummary(rows, "2026-07-01")).toEqual({
      asOfDate: "2026-07-01",
      matureInstalls: 2,
      firstWeekMultiDayInstalls: 1,
      week2RetainedInstalls: 1,
      week4RetainedInstalls: 1,
      firstWeekMultiDayRate: 50,
      week2RetentionRate: 50,
      week4RetentionRate: 50,
    });
  });

  it("deduplicates multiple saves on the same day", () => {
    const rows: RecordActivityDay[] = [
      { installIdHash: "a", activityDate: "2026-06-01" },
      { installIdHash: "a", activityDate: "2026-06-01" },
    ];

    expect(
      calculateRetentionSummary(rows, "2026-07-01").firstWeekMultiDayRate
    ).toBe(0);
  });

  it("returns null rates until at least one install has 4 weeks of observation", () => {
    const summary = calculateRetentionSummary(
      [{ installIdHash: "a", activityDate: "2026-07-20" }],
      "2026-07-25"
    );

    expect(summary.matureInstalls).toBe(0);
    expect(summary.week2RetentionRate).toBeNull();
    expect(summary.week4RetentionRate).toBeNull();
  });
});

describe("toJapanDate", () => {
  it("uses Japan time for the activity date", () => {
    expect(toJapanDate(new Date("2026-07-25T14:59:59.000Z"))).toBe("2026-07-25");
    expect(toJapanDate(new Date("2026-07-25T15:00:00.000Z"))).toBe("2026-07-26");
  });
});
