import { describe, expect, it } from "vitest";
import {
  getMoodCategoryDotClass,
  getPredefinedCategory,
  normalizeMoodLabels,
} from "./mood-labels";

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
