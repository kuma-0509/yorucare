import { describe, expect, it } from "vitest";
import { calculateRetentionSummary } from "./analytics-retention";
import type { RetentionSummary } from "./analytics-retention";
import { formatRetentionReport } from "./analytics-retention-report";

function summaryWith(overrides: Partial<RetentionSummary>): RetentionSummary {
  return {
    asOfDate: "2026-08-18",
    matureInstalls: 20,
    firstWeekMultiDayInstalls: 12,
    week2RetainedInstalls: 10,
    week4RetainedInstalls: 7,
    firstWeekMultiDayRate: 60,
    week2RetentionRate: 50,
    week4RetentionRate: 35,
    medianWeeklyRecordDays: 2,
    weeklyRecordDaySamples: 80,
    interruptedInstalls: 5,
    resumedInstalls: 2,
    resumptionRate: 40,
    ...overrides,
  };
}

describe("formatRetentionReport", () => {
  it("主要指標5件をすべて母数つきで出す", () => {
    const report = formatRetentionReport(summaryWith({}));

    expect(report).toContain("初週複数日記録率: 60%（対象20件中12件）");
    expect(report).toContain("Week 2 継続率: 50%（対象20件中10件）");
    expect(report).toContain("Week 4 継続率: 35%（対象20件中7件）");
    expect(report).toContain(
      "週あたり記録日数（中央値）: 2日（対象は端末・ブラウザ×週で80件）"
    );
    expect(report).toContain(
      "中断後再開率: 40%（記録がない日が7日以上続いた対象5件中2件）"
    );
  });

  it("母数が0のときは 0% ではなく出さないと書く", () => {
    const report = formatRetentionReport(
      summaryWith({
        matureInstalls: 0,
        firstWeekMultiDayInstalls: 0,
        week2RetainedInstalls: 0,
        week4RetainedInstalls: 0,
        firstWeekMultiDayRate: null,
        week2RetentionRate: null,
        week4RetentionRate: null,
        medianWeeklyRecordDays: null,
        weeklyRecordDaySamples: 0,
        interruptedInstalls: 0,
        resumedInstalls: 0,
        resumptionRate: null,
      })
    );

    expect(report).not.toContain("0%");
    expect(report).toContain("Week 2 継続率: —（対象が0件のため出さない）");
    expect(report).toContain(
      "中断後再開率: —（記録がない日が7日以上続いた対象が0件のため出さない）"
    );
    expect(report).toContain(
      "週あたり記録日数（中央値）: —（対象が0件のため出さない）"
    );
  });

  it("対象が15件未満のときは Gate 1 の判定を出さないと書く", () => {
    const report = formatRetentionReport(summaryWith({ matureInstalls: 14 }));

    expect(report).toContain("Gate 1 の判定: 出さない");
    expect(report).toContain("いまは14件");
  });

  it("対象が15件以上でも、このスクリプトは合否を出さない", () => {
    const report = formatRetentionReport(summaryWith({ matureInstalls: 15 }));

    expect(report).toContain("このスクリプトは合否を出さない");
  });

  it("集計上の限界を必ず併記する", () => {
    const report = formatRetentionReport(summaryWith({}));

    expect(report).toContain("集計上の限界:");
    expect(report).toContain("複数の端末やブラウザ");
    expect(report).toContain("ブラウザのデータを削除");
    expect(report).toContain("送信に同意していない利用");
    expect(report).toContain("医学的効果の根拠ではない");
    expect(report).toContain("少人数の個人を推測できる内訳を出さない");
  });

  it("端末・ブラウザごとの行を出さない", () => {
    // 不可逆化した識別子であっても、出力へは載せない
    const rows = [
      { installIdHash: "hash-of-install-a", activityDate: "2026-06-01" },
      { installIdHash: "hash-of-install-a", activityDate: "2026-06-02" },
      { installIdHash: "hash-of-install-b", activityDate: "2026-06-01" },
    ];
    const report = formatRetentionReport(
      calculateRetentionSummary(rows, "2026-07-20")
    );

    expect(report).not.toContain("hash-of-install-a");
    expect(report).not.toContain("hash-of-install-b");
    expect(report).not.toContain("2026-06-01");
  });
});
