import { describe, expect, it } from "vitest";
import {
  buildComparisonSeriesFromRecords,
  countComparisonPoints,
  countRecordedPoints,
  DISTRESS_SIGN_VALUE_MAP,
  formatDistressSignAxisTick,
  formatDistressSignValue,
  getYAxisDomain,
  toComparisonPoints,
  type ChartMetricConfig,
  type ComparisonDataPoint,
  type TrendDataPoint,
} from "./chart-data";
import { getTodayString } from "./dates";
import type { DailyRecord } from "./types";

describe("DISTRESS_SIGN_VALUE_MAP", () => {
  it("しんどさの段階を数値へ写像する", () => {
    expect(DISTRESS_SIGN_VALUE_MAP.none).toBe(0);
    expect(DISTRESS_SIGN_VALUE_MAP.small).toBe(-1);
    expect(DISTRESS_SIGN_VALUE_MAP.yes).toBe(-2);
  });
});

describe("formatDistressSign*", () => {
  it("軸目盛りラベル", () => {
    expect(formatDistressSignAxisTick(0)).toBe("なし");
    expect(formatDistressSignAxisTick(-1)).toBe("少しあり");
    expect(formatDistressSignAxisTick(-2)).toBe("あり");
  });

  it("値ラベル（整数は名称、非整数は小数）", () => {
    expect(formatDistressSignValue(0)).toBe("なし");
    expect(formatDistressSignValue(-1.5)).toBe("-1.5");
  });
});

describe("countRecordedPoints", () => {
  it("null以外の点数を数える", () => {
    const points: TrendDataPoint[] = [
      { date: "2026-01-01", label: "1/1", value: 3 },
      { date: "2026-01-02", label: "1/2", value: null },
      { date: "2026-01-03", label: "1/3", value: 4 },
    ];
    expect(countRecordedPoints(points)).toBe(2);
  });
});

describe("getYAxisDomain", () => {
  const metric = { id: "selfCare" } as ChartMetricConfig;

  it("固定domainがあればそれを返す", () => {
    const fixed = { ...metric, domain: [1, 5] } as ChartMetricConfig;
    expect(getYAxisDomain(fixed, [])).toEqual([1, 5]);
  });

  it("値がなければ [0,1]", () => {
    expect(getYAxisDomain(metric, [])).toEqual([0, 1]);
  });

  it("最大値+1を上限にする", () => {
    const points: TrendDataPoint[] = [
      { date: "d", label: "d", value: 3 },
      { date: "e", label: "e", value: null },
    ];
    expect(getYAxisDomain(metric, points)).toEqual([0, 4]);
  });
});

describe("buildComparisonSeriesFromRecords", () => {
  const today = getTodayString();

  function record(
    date: string,
    overrides: Partial<DailyRecord> = {}
  ): DailyRecord {
    return {
      id: date,
      date,
      moodScore: 4,
      moodLabels: [],
      sleepStart: "23:00",
      sleepEnd: "07:00",
      sleepMinutes: 480,
      medication: null,
      warningLevel: null,
      warningTags: [],
      warningNote: "",
      selfCareIds: [],
      selfCareMemo: "",
      selfCareFeeling: null,
      note: "",
      tomorrowGoal: "",
      goalReviewStatus: null,
      createdAt: `${date}T00:00:00.000Z`,
      updatedAt: `${date}T00:00:00.000Z`,
      ...overrides,
    };
  }

  it("重ねる項目を選んでいなければ、比べる側は常に空", () => {
    const points = buildComparisonSeriesFromRecords("week", "mood", null, [
      record(today),
    ]);

    expect(points.every((p) => p.compareValue === null)).toBe(true);
    expect(points.find((p) => p.date === today)?.value).toBe(4);
  });

  it("同じ項目を重ねようとしたら、線を二重にしない", () => {
    const points = buildComparisonSeriesFromRecords("week", "mood", "mood", [
      record(today),
    ]);

    expect(points.every((p) => p.compareValue === null)).toBe(true);
  });

  it("2項目を同じ日付の並びで返す", () => {
    const points = buildComparisonSeriesFromRecords("week", "mood", "sleep", [
      record(today),
    ]);
    const point = points.find((p) => p.date === today);

    expect(point?.value).toBe(4);
    expect(point?.compareValue).toBe(8);
  });

  it("片方だけ記録がある日は、もう片方を空のままにする", () => {
    const points = buildComparisonSeriesFromRecords("week", "mood", "sleep", [
      record(today, { sleepStart: null, sleepEnd: null, sleepMinutes: null }),
    ]);
    const point = points.find((p) => p.date === today);

    expect(point?.value).toBe(4);
    expect(point?.compareValue).toBeNull();
  });

  it("記録がない日は両方とも空にする", () => {
    const points = buildComparisonSeriesFromRecords("week", "mood", "sleep", []);

    expect(points.every((p) => p.value === null)).toBe(true);
    expect(points.every((p) => p.compareValue === null)).toBe(true);
  });
});

describe("countComparisonPoints", () => {
  it("比べる側に値がある点だけ数える", () => {
    const points: ComparisonDataPoint[] = [
      { date: "2026-01-01", label: "1/1", value: 3, compareValue: 7 },
      { date: "2026-01-02", label: "1/2", value: 4, compareValue: null },
    ];
    expect(countComparisonPoints(points)).toBe(1);
  });
});

describe("toComparisonPoints", () => {
  it("比べる側の値を縦軸計算用の点として取り出す", () => {
    const points: ComparisonDataPoint[] = [
      { date: "2026-01-01", label: "1/1", value: 3, compareValue: 7 },
      { date: "2026-01-02", label: "1/2", value: 4, compareValue: null },
    ];
    expect(toComparisonPoints(points)).toEqual([
      { date: "2026-01-01", label: "1/1", value: 7 },
      { date: "2026-01-02", label: "1/2", value: null },
    ]);
  });
});
