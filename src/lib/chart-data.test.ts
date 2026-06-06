import { describe, expect, it } from "vitest";
import {
  countRecordedPoints,
  DISTRESS_SIGN_VALUE_MAP,
  formatDistressSignAxisTick,
  formatDistressSignValue,
  getYAxisDomain,
  type ChartMetricConfig,
  type TrendDataPoint,
} from "./chart-data";

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
