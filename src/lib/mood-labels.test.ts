import { describe, expect, it } from "vitest";
import {
  getMoodCategoryDotClass,
  getMoodCategoryLabel,
  getPredefinedCategory,
  normalizeMoodLabels,
  updateMoodLabelCategory,
} from "./mood-labels";
import type { MoodLabelEntry } from "./types";

describe("normalizeMoodLabels", () => {
  it("旧形式（文字列）を新形式に変換する", () => {
    const result = normalizeMoodLabels(["嬉しい"]);
    expect(result).toEqual([
      { label: "嬉しい", category: "ポジティブ", isCustom: false },
    ]);
  });

  it("レガシーの英語カテゴリを日本語カテゴリへ移行する", () => {
    const result = normalizeMoodLabels([
      { label: "自作ラベル", category: "slightly_negative", isCustom: true },
    ]);
    expect(result[0].category).toBe("ややネガティブ");
  });

  it("重複ラベルを除去する", () => {
    const result = normalizeMoodLabels(["嬉しい", "嬉しい"]);
    expect(result).toHaveLength(1);
  });

  it("最大3件までに制限する", () => {
    const result = normalizeMoodLabels([
      "嬉しい",
      "楽しい",
      "安心",
      "満足",
    ]);
    expect(result).toHaveLength(3);
  });

  it("配列以外は空配列", () => {
    expect(normalizeMoodLabels("嬉しい")).toEqual([]);
    expect(normalizeMoodLabels(null)).toEqual([]);
  });

  it("未知の文字列ラベルはカスタム・普通カテゴリ", () => {
    const result = normalizeMoodLabels(["なんとなく"]);
    expect(result[0]).toEqual({
      label: "なんとなく",
      category: "普通",
      isCustom: true,
    });
  });
});

describe("getPredefinedCategory", () => {
  it("定義済みラベルのカテゴリを返す", () => {
    expect(getPredefinedCategory("不安")).toBe("ネガティブ");
    expect(getPredefinedCategory("満足")).toBe("ポジティブ");
  });

  it("未知ラベルは null", () => {
    expect(getPredefinedCategory("xyz")).toBeNull();
  });
});

describe("getMoodCategoryDotClass", () => {
  it("カテゴリごとのトークンクラスを返す", () => {
    expect(getMoodCategoryDotClass("ポジティブ")).toBe("bg-mood-positive");
    expect(getMoodCategoryDotClass("ネガティブ")).toBe("bg-mood-negative");
  });
});

describe("getMoodCategoryLabel", () => {
  it("画面に出す区分名を返す", () => {
    expect(getMoodCategoryLabel("ややポジティブ")).toBe("ややポジティブ");
    expect(getMoodCategoryLabel("普通")).toBe("普通");
  });
});

describe("updateMoodLabelCategory", () => {
  const entries: MoodLabelEntry[] = [
    { label: "そわそわ", category: "普通", isCustom: true },
    { label: "嬉しい", category: "ポジティブ", isCustom: false },
  ];

  it("指定した気持ちの区分だけを差し替える", () => {
    const result = updateMoodLabelCategory(
      entries,
      "そわそわ",
      "ややネガティブ"
    );
    expect(result[0]).toEqual({
      label: "そわそわ",
      category: "ややネガティブ",
      isCustom: true,
    });
    // 並び順も他の気持ちも変えない
    expect(result[1]).toEqual(entries[1]);
    expect(result).toHaveLength(2);
  });

  it("元の配列は書き換えない", () => {
    updateMoodLabelCategory(entries, "そわそわ", "ネガティブ");
    expect(entries[0].category).toBe("普通");
  });

  it("一致する気持ちがなければそのまま返す", () => {
    const result = updateMoodLabelCategory(entries, "ない気持ち", "ネガティブ");
    expect(result).toEqual(entries);
  });
});
