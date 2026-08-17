import { describe, expect, it } from "vitest";
import {
  NARRATIVE_FORBIDDEN_WORDS,
  NARRATIVE_MAX_LENGTH,
  verifyNarrative,
} from "./narrative-guard";

describe("verifyNarrative", () => {
  it("制約を満たす1文はそのまま通す", () => {
    const verdict = verifyNarrative("この期間に残った記録を並べています。");
    expect(verdict).toEqual({
      ok: true,
      text: "この期間に残った記録を並べています。",
    });
  });

  it("前後の空白は落として返す", () => {
    const verdict = verifyNarrative("  記録が残っています。  ");
    expect(verdict.ok && verdict.text).toBe("記録が残っています。");
  });

  it("空文字と空白だけの文を弾く", () => {
    expect(verifyNarrative("")).toEqual({ ok: false, reason: "empty" });
    expect(verifyNarrative("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("上限を超える長さを弾く", () => {
    const text = "あ".repeat(NARRATIVE_MAX_LENGTH + 1);
    expect(verifyNarrative(text)).toEqual({ ok: false, reason: "tooLong" });
  });

  it("上限ちょうどは通す", () => {
    const text = "あ".repeat(NARRATIVE_MAX_LENGTH);
    expect(verifyNarrative(text).ok).toBe(true);
  });

  it("穴ごとの上限を指定できる", () => {
    expect(verifyNarrative("あいうえお", 4)).toEqual({
      ok: false,
      reason: "tooLong",
    });
    expect(verifyNarrative("あいうえお", 5).ok).toBe(true);
  });

  it("改行や制御文字を弾く", () => {
    expect(verifyNarrative("記録が\n残っています。")).toEqual({
      ok: false,
      reason: "controlCharacter",
    });
    expect(verifyNarrative("記録が\t残っています。")).toEqual({
      ok: false,
      reason: "controlCharacter",
    });
  });

  it("数を含む文を弾く（数値はアプリが埋めるため）", () => {
    for (const text of [
      "3日分の記録が残っています。",
      "３日分の記録が残っています。",
      "七日分の記録が残っています。",
      "半分ほどの割で記録が残っています。",
      "およそ50%の日に記録が残っています。",
    ]) {
      expect(verifyNarrative(text)).toEqual({
        ok: false,
        reason: "containsNumber",
      });
    }
  });

  it("URLらしき文字列を弾く", () => {
    for (const text of [
      "詳しくは https://example.test を見る形になります。",
      "詳しくは www.example.test にあります。",
    ]) {
      expect(verifyNarrative(text).ok).toBe(false);
    }
  });

  it("評価語・助言・診断・危機に読める語を弾き、当たった語を返す", () => {
    const verdict = verifyNarrative("記録は順調に残っています。");
    expect(verdict).toEqual({
      ok: false,
      reason: "forbiddenWord",
      detail: "順調",
    });
  });

  it("禁止語の一覧はすべて実際に弾かれる", () => {
    for (const word of NARRATIVE_FORBIDDEN_WORDS) {
      const verdict = verifyNarrative(`記録に${word}が含まれます。`);
      expect(verdict.ok, word).toBe(false);
    }
  });

  it("助言・診断に読める言い回しを弾く", () => {
    for (const text of [
      "明日はもう少し早く寝ましょう。",
      "気になるときは受診を考える形になります。",
      "この期間は危険な状態に見えます。",
      "できることの効果が出ています。",
    ]) {
      expect(verifyNarrative(text).ok, text).toBe(false);
    }
  });

  it("禁止語に無い言い回しは通ってしまう（この層は保証ではない）", () => {
    // 挙げていない語で書かれた診断・助言は、この判定を素通りする。
    // だからこそ穴は自由文ではなく、アプリが書いた候補からの選択にしてある
    // （`report-narrative.ts`）。この事実をテストとして残し、
    // 後から「検証層があるから自由文でも安全」と読まれないようにする。
    for (const text of ["肺炎です。", "薬を増やすと良いでしょう。"]) {
      expect(verifyNarrative(text).ok, text).toBe(true);
    }
  });

  it("文字列でない値を空として扱う", () => {
    expect(verifyNarrative(undefined as unknown as string)).toEqual({
      ok: false,
      reason: "empty",
    });
  });
});
