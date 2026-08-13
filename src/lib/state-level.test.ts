import { describe, expect, it } from "vitest";
import {
  getDefaultScoreForStateLevel,
  getStateLevelFromScore,
} from "./state-level";

describe("getStateLevelFromScore", () => {
  it("未入力（null）はnullを返す", () => {
    expect(getStateLevelFromScore(null)).toBeNull();
  });

  it("4・5は「よい」に対応する", () => {
    expect(getStateLevelFromScore(5)).toBe("good");
    expect(getStateLevelFromScore(4)).toBe("good");
  });

  it("3は「ふつう」に対応する", () => {
    expect(getStateLevelFromScore(3)).toBe("normal");
  });

  it("1・2は「しんどい」に対応する", () => {
    expect(getStateLevelFromScore(2)).toBe("hard");
    expect(getStateLevelFromScore(1)).toBe("hard");
  });
});

describe("getDefaultScoreForStateLevel", () => {
  it("各段階の既定値は対応する範囲に含まれる", () => {
    expect(getStateLevelFromScore(getDefaultScoreForStateLevel("good"))).toBe(
      "good"
    );
    expect(
      getStateLevelFromScore(getDefaultScoreForStateLevel("normal"))
    ).toBe("normal");
    expect(getStateLevelFromScore(getDefaultScoreForStateLevel("hard"))).toBe(
      "hard"
    );
  });

  it("既定値は両端ではなく控えめな値を選ぶ", () => {
    expect(getDefaultScoreForStateLevel("good")).toBe(4);
    expect(getDefaultScoreForStateLevel("hard")).toBe(2);
  });
});
