import { describe, expect, it } from "vitest";
import {
  buildSelfCareSuggestions,
  MAX_SELF_CARE_SUGGESTIONS,
} from "./self-care";
import type { StateLevel } from "./types";

const ALL_LEVELS: StateLevel[] = ["good", "normal", "hard"];

describe("buildSelfCareSuggestions", () => {
  it("状態を選んでいない日は案を出さない", () => {
    expect(buildSelfCareSuggestions(null, [])).toEqual([]);
    expect(buildSelfCareSuggestions(null, ["眠れない"])).toEqual([]);
  });

  it.each(ALL_LEVELS)("%s の日は状態に応じた案を出す", (level) => {
    const suggestions = buildSelfCareSuggestions(level, []);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("状態ごとに違う案を出す", () => {
    const [good, normal, hard] = ALL_LEVELS.map((level) =>
      buildSelfCareSuggestions(level, []).join("／")
    );
    expect(new Set([good, normal, hard]).size).toBe(3);
  });

  it("しんどさのサインを選ぶと、その区分の案が加わる", () => {
    const withoutTag = buildSelfCareSuggestions("hard", []);
    const withTag = buildSelfCareSuggestions("hard", ["眠れない"]);

    expect(withTag).not.toEqual(withoutTag);
    expect(withTag).toContain("布団に入る時間を15分早める");
  });

  it("区分が違うタグでは違う案が加わる", () => {
    const sleep = buildSelfCareSuggestions("hard", ["眠れない"]);
    const mood = buildSelfCareSuggestions("hard", ["涙が出る"]);
    const work = buildSelfCareSuggestions("hard", ["出勤がつらい"]);

    expect(sleep[0]).not.toBe(mood[0]);
    expect(mood[0]).not.toBe(work[0]);
  });

  it("同じ区分のタグをいくつ選んでも案は同じ", () => {
    expect(buildSelfCareSuggestions("hard", ["眠れない"])).toEqual(
      buildSelfCareSuggestions("hard", ["眠れない", "朝起きづらい"])
    );
  });

  it("「その他」だけを選んでも案を変えない", () => {
    expect(buildSelfCareSuggestions("normal", ["その他"])).toEqual(
      buildSelfCareSuggestions("normal", [])
    );
  });

  it("タグを多く選んでも上限を超えない", () => {
    const suggestions = buildSelfCareSuggestions("hard", [
      "眠れない",
      "涙が出る",
      "出勤がつらい",
    ]);
    expect(suggestions.length).toBeLessThanOrEqual(MAX_SELF_CARE_SUGGESTIONS);
  });

  it("タグを多く選んでも状態に応じた案が1つは残る", () => {
    const base = buildSelfCareSuggestions("hard", []);
    const withAllTags = buildSelfCareSuggestions("hard", [
      "眠れない",
      "涙が出る",
      "出勤がつらい",
    ]);
    expect(withAllTags.some((item) => base.includes(item))).toBe(true);
  });

  it("同じ案を重複させない", () => {
    const suggestions = buildSelfCareSuggestions("hard", [
      "眠れない",
      "涙が出る",
    ]);
    expect(new Set(suggestions).size).toBe(suggestions.length);
  });

  it("同じ入力からは常に同じ並びを返す", () => {
    expect(buildSelfCareSuggestions("normal", ["涙が出る"])).toEqual(
      buildSelfCareSuggestions("normal", ["涙が出る"])
    );
  });

  it("知らないタグを渡しても状態だけの案に落ちる", () => {
    expect(buildSelfCareSuggestions("good", ["未知のタグ"])).toEqual(
      buildSelfCareSuggestions("good", [])
    );
  });

  it("診断・治療・危機判定に読める語を案に含めない", () => {
    const all = ALL_LEVELS.flatMap((level) =>
      buildSelfCareSuggestions(level, [
        "眠れない",
        "涙が出る",
        "出勤がつらい",
      ])
    ).join("");

    for (const word of [
      "受診",
      "病院",
      "医師",
      "主治医",
      "薬",
      "服用",
      "治療",
      "治し",
      "症状",
      "診断",
      "うつ",
      "障害",
      "危険",
      "すぐに",
      "必ず",
      "べき",
    ]) {
      expect(all).not.toContain(word);
    }
  });
});
