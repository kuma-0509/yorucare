import { describe, expect, it } from "vitest";
import {
  MOOD_LABEL_NEGATIVE,
  MOOD_LABEL_NEUTRAL,
  MOOD_LABEL_POSITIVE,
  WARNING_TAGS_BODY,
  WARNING_TAGS_OTHER,
  WARNING_TAGS_SLEEP,
  WARNING_TAGS_WORK,
} from "./constants";

/**
 * 「気持ち」と「しんどさのサイン」の役割が混ざらないことを固定する。
 *
 * 以前はサイン側にも感情の語があり、気持ちのラベルと言い換えの関係になっていて、
 * 利用者がどちらを選ぶか迷う原因になっていた。
 * サインは体と生活に出た変化だけを扱い、感じている気持ちは気持ちのラベルで選ぶ。
 */

const ALL_WARNING_TAGS = [
  ...WARNING_TAGS_SLEEP,
  ...WARNING_TAGS_BODY,
  ...WARNING_TAGS_WORK,
  ...WARNING_TAGS_OTHER,
];

const ALL_MOOD_LABELS = [
  ...MOOD_LABEL_POSITIVE,
  ...MOOD_LABEL_NEUTRAL,
  ...MOOD_LABEL_NEGATIVE,
];

describe("しんどさのサインと気持ちのラベルの役割", () => {
  it("同じ語を両方に置かない", () => {
    const overlap = ALL_WARNING_TAGS.filter((tag) =>
      (ALL_MOOD_LABELS as readonly string[]).includes(tag)
    );
    expect(overlap).toEqual([]);
  });

  it("サインに感情そのものを表す語を置かない", () => {
    // 気持ちのラベル側にある語を、程度をつけて言い換えただけの語も置かない
    const emotionWords = [
      "不安",
      "イライラ",
      "落ち込み",
      "焦",
      "悲し",
      "怒",
      "こわい",
      "嫌い",
      "後悔",
    ];

    for (const tag of ALL_WARNING_TAGS) {
      for (const word of emotionWords) {
        expect(
          tag.includes(word),
          `「${tag}」は感情の語「${word}」を含んでいる`
        ).toBe(false);
      }
    }
  });

  it("サインの区分に重複した語を置かない", () => {
    expect(new Set(ALL_WARNING_TAGS).size).toBe(ALL_WARNING_TAGS.length);
  });

  it("気持ちのラベルに重複した語を置かない", () => {
    expect(new Set(ALL_MOOD_LABELS).size).toBe(ALL_MOOD_LABELS.length);
  });

  it("サインから外した感情の語を、気持ちのラベルで選べる", () => {
    // 選択肢から消えただけで、記録できる内容が減らないようにする
    for (const label of ["不安", "イライラ", "落ち込み", "焦り"]) {
      expect(ALL_MOOD_LABELS).toContain(label);
    }
  });
});
