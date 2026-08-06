import { describe, expect, it } from "vitest";
import { COPY } from "./copy";

/**
 * 今回追加した画面文言の制約をここで固定する。
 *
 * 安全の案内（119・110・ひとりにならない）と、データの確認を促す案内は
 * 「〜してください」を使う。これは本人の状態に対する助言ではなく、
 * 安全とデータの正確さのための案内なので、この検査の対象から外す。
 */

const stateWordingTexts: string[] = [
  ...Object.values(COPY.changeFacts),
  ...Object.values(COPY.movement),
  COPY.support.finderTitle,
  COPY.support.finderDescription,
  COPY.support.urgencyNote,
  COPY.support.resultsHeading,
  COPY.support.noResults,
  COPY.support.demoNotice,
  COPY.support.statusOpen,
  COPY.support.statusOpen24Hours,
  COPY.support.statusBeforeOpening,
  COPY.support.statusClosedToday,
  COPY.support.statusClosedByDay,
  COPY.support.statusUnknown,
  ...Object.values(COPY.shareExtras),
];

const allNewTexts: string[] = [
  ...stateWordingTexts,
  ...COPY.support.safetyItems,
  COPY.support.safetyHeading,
  COPY.support.dataVerifyBody,
  COPY.support.dataAboutHeading,
  COPY.support.plannedNote,
];

describe("追加した画面文言", () => {
  it("状態に関する文言に評価語を使わない", () => {
    for (const text of stateWordingTexts) {
      for (const word of ["改善", "悪化", "良好", "順調", "ダメ"]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it("状態に関する文言に助言表現を使わない", () => {
    for (const text of stateWordingTexts) {
      for (const word of [
        "しましょう",
        "ましょう",
        "すべき",
        "おすすめ",
        "必要があります",
        "したほうが",
      ]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it("記録がない日を失敗として書かない", () => {
    for (const text of allNewTexts) {
      for (const word of ["抜け", "できなかった", "未達", "サボ", "怠"]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it("スティグマを生む語を使わない", () => {
    for (const text of allNewTexts) {
      for (const word of ["異常", "重症", "病んで", "問題行動"]) {
        expect(text).not.toContain(word);
      }
    }
  });

  it("割合ではなく日数で示す前提を崩さない", () => {
    for (const text of stateWordingTexts) {
      expect(text).not.toContain("達成率");
      expect(text).not.toContain("連続日数を伸ば");
    }
  });

  it("緊急度は本人が選ぶものだと明示する", () => {
    expect(COPY.support.urgencyNote).toContain("判定することはありません");
  });

  it("休むことを対等な選択肢として書く", () => {
    expect(COPY.movement.restHeading).toContain("選択肢");
    expect(COPY.movement.notCounted).toContain("数えることはありません");
  });

  it("集計であって診断ではないと書く", () => {
    expect(COPY.changeFacts.description).toContain("数えたもの");
  });

  it("デモデータであることを画面で明示する", () => {
    expect(COPY.support.demoBadge).toBe("デモデータ");
    expect(COPY.support.demoNotice).toContain("実在の窓口ではない");
  });

  it("データの更新日が確認できない場合の案内を持つ", () => {
    expect(COPY.support.dataVerifyBody).toContain("公式サイトか電話");
  });
});
