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
      // a は 2日/1日/0日/1日、b は 1日/0日/0日/0日。並べると
      // 0,0,0,0,1,1,1,2 の8件で、真ん中2つの平均は 0.5日
      medianWeeklyRecordDays: 0.5,
      weeklyRecordDaySamples: 8,
      // a は 06-10 と 06-24 の間が13日空いて戻っている（06-03 と 06-10 の
      // 6日空きは中断にしない）。b は 06-01 だけなので、そのあと戻っていない
      interruptedInstalls: 2,
      resumedInstalls: 1,
      resumptionRate: 50,
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

describe("calculateRetentionSummary の週あたり記録日数", () => {
  /** day0 から数えた日数を日付にする */
  function offsetDate(offset: number): string {
    return new Date(Date.UTC(2026, 5, 1) + offset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  function rowsFromOffsets(
    installIdHash: string,
    offsets: number[]
  ): RecordActivityDay[] {
    return offsets.map((offset) => ({
      installIdHash,
      activityDate: offsetDate(offset),
    }));
  }

  it("記録が0日の週も母数に数える", () => {
    // 第1週だけ4日記録し、第2〜4週は記録なし
    const summary = calculateRetentionSummary(
      rowsFromOffsets("a", [0, 1, 2, 3]),
      offsetDate(40)
    );

    expect(summary.weeklyRecordDaySamples).toBe(4);
    // 4,0,0,0 の真ん中2つの平均。0日の週を除くと 4日になってしまう
    expect(summary.medianWeeklyRecordDays).toBe(0);
  });

  it("観測窓（Day 0〜Day 27）より後の記録は数えない", () => {
    const summary = calculateRetentionSummary(
      rowsFromOffsets("a", [0, 28, 29, 30, 31, 32]),
      offsetDate(60)
    );

    expect(summary.weeklyRecordDaySamples).toBe(4);
    expect(summary.medianWeeklyRecordDays).toBe(0);
  });

  it("対象の端末・ブラウザがなければ null を返す", () => {
    const summary = calculateRetentionSummary(
      rowsFromOffsets("a", [0]),
      offsetDate(5)
    );

    expect(summary.medianWeeklyRecordDays).toBeNull();
    expect(summary.weeklyRecordDaySamples).toBe(0);
  });

  it("端末・ブラウザ×週の中央値を出す", () => {
    const summary = calculateRetentionSummary(
      [
        // 週ごとに 3,3,3,3 日
        ...rowsFromOffsets("a", [0, 1, 2, 7, 8, 9, 14, 15, 16, 21, 22, 23]),
        // 週ごとに 1,1,1,1 日
        ...rowsFromOffsets("b", [0, 7, 14, 21]),
      ],
      offsetDate(40)
    );

    expect(summary.weeklyRecordDaySamples).toBe(8);
    // 1,1,1,1,3,3,3,3 の真ん中2つの平均
    expect(summary.medianWeeklyRecordDays).toBe(2);
  });

  it("中断後再開率は、記録がない日が7日以上続いた端末・ブラウザを分母にする", () => {
    const summary = calculateRetentionSummary(
      [
        // 7日空けてから戻った（中断あり・再開あり）
        ...rowsFromOffsets("resumed", [0, 8, 20]),
        // 6日空きは中断にしない（中断なし）
        ...rowsFromOffsets("continued", [0, 7, 14, 21, 27]),
        // 途中で止まったまま戻っていない（中断あり・再開なし）
        ...rowsFromOffsets("stopped", [0, 1, 2]),
      ],
      offsetDate(40)
    );

    expect(summary.matureInstalls).toBe(3);
    expect(summary.interruptedInstalls).toBe(2);
    expect(summary.resumedInstalls).toBe(1);
    expect(summary.resumptionRate).toBe(50);
  });

  it("中断がなければ再開率は null（0%と区別する）", () => {
    const summary = calculateRetentionSummary(
      rowsFromOffsets("a", [0, 7, 14, 21, 27]),
      offsetDate(40)
    );

    expect(summary.interruptedInstalls).toBe(0);
    expect(summary.resumptionRate).toBeNull();
  });

  it("観測窓の終わりまで記録が戻らない場合も中断として数える", () => {
    // ここを数えないと、分母が再開した端末だけになり再開率が必ず100%になる
    const summary = calculateRetentionSummary(
      rowsFromOffsets("a", [0, 1]),
      offsetDate(40)
    );

    expect(summary.interruptedInstalls).toBe(1);
    expect(summary.resumedInstalls).toBe(0);
    expect(summary.resumptionRate).toBe(0);
  });
});

describe("toJapanDate", () => {
  it("uses Japan time for the activity date", () => {
    expect(toJapanDate(new Date("2026-07-25T14:59:59.000Z"))).toBe("2026-07-25");
    expect(toJapanDate(new Date("2026-07-25T15:00:00.000Z"))).toBe("2026-07-26");
  });
});
