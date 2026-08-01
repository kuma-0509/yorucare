import { indexRecordsByDate } from "./range";
import type { DailyRecord, SelfCareItem } from "../types";

/**
 * 「できること」を実行した日と、実行しなかった日の差分。
 *
 * キー名に「効果」「effect」を使わない。
 * LLMは渡された言葉に引きずられ、相関を因果として断定する。
 * ここが返すのは、実行日と非実行日で観測値がどれだけ違ったかという事実だけで、
 * 実行したから良くなったという主張ではない。
 */

/**
 * 差分を出すために片側へ最低限必要な日数。
 * 1日や2日の差を並べると、LLMも本人も意味のある傾向として読んでしまう。
 * これを下回る側がある場合は差分を null にして、判断材料にしない。
 */
export const MIN_DAYS_FOR_COMPARISON = 3;

export type SelfCareRelation = {
  /** 「できること」のタイトル */
  name: string;
  /** 期間内で実行した日数 */
  daysDone: number;
  /** 期間内で実行しなかった、記録がある日数 */
  daysNotDone: number;
  /** 実行日の moodScore 平均（小数第1位）。対象がなければ null */
  averageMoodOnDoneDays: number | null;
  /** 非実行日の moodScore 平均（小数第1位）。対象がなければ null */
  averageMoodOnOtherDays: number | null;
  /**
   * 実行日の平均から非実行日の平均を引いた値（小数第1位）。
   * 片側の日数が MIN_DAYS_FOR_COMPARISON を下回る場合は null
   */
  differenceInAverage: number | null;
  /** 実行日のうち warningLevel が yes だった日数 */
  warningYesOnDoneDays: number;
  /** 非実行日のうち warningLevel が yes だった日数 */
  warningYesOnOtherDays: number;
};

export type SelfCareRelationResult = {
  relations: SelfCareRelation[];
  /** 集計の母数となった、記録があった日数 */
  recordedDays: number;
  /** 差分を出すために片側へ必要とした日数。呼び出し側が根拠を示せるようにする */
  minDaysForComparison: number;
};

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return roundTo(values.reduce((sum, v) => sum + v, 0) / values.length, 1);
}

/**
 * 「できること」ごとに、実行日と非実行日の観測値を並べる。
 *
 * 非実行日の母数は「期間内のすべての日」ではなく「記録がある日」にする。
 * 記録がない日を非実行日に含めると、記録できなかった日が
 * 「セルフケアをしなかった日」として数えられてしまう。
 */
export function relateSelfCareToMood(
  records: DailyRecord[],
  selfCareItems: SelfCareItem[],
  from: string,
  to: string
): SelfCareRelationResult {
  const target = [...indexRecordsByDate(records, from, to).values()];

  const relations = selfCareItems.map((item) => {
    const doneMood: number[] = [];
    const otherMood: number[] = [];
    let daysDone = 0;
    let daysNotDone = 0;
    let warningYesOnDoneDays = 0;
    let warningYesOnOtherDays = 0;

    for (const record of target) {
      const done = record.selfCareIds.includes(item.id);
      if (done) {
        daysDone += 1;
        if (record.moodScore !== null) doneMood.push(record.moodScore);
        if (record.warningLevel === "yes") warningYesOnDoneDays += 1;
      } else {
        daysNotDone += 1;
        if (record.moodScore !== null) otherMood.push(record.moodScore);
        if (record.warningLevel === "yes") warningYesOnOtherDays += 1;
      }
    }

    const averageMoodOnDoneDays = average(doneMood);
    const averageMoodOnOtherDays = average(otherMood);
    const comparable =
      doneMood.length >= MIN_DAYS_FOR_COMPARISON &&
      otherMood.length >= MIN_DAYS_FOR_COMPARISON;

    return {
      name: item.title,
      daysDone,
      daysNotDone,
      averageMoodOnDoneDays,
      averageMoodOnOtherDays,
      differenceInAverage:
        comparable &&
        averageMoodOnDoneDays !== null &&
        averageMoodOnOtherDays !== null
          ? roundTo(averageMoodOnDoneDays - averageMoodOnOtherDays, 1)
          : null,
      warningYesOnDoneDays,
      warningYesOnOtherDays,
    };
  });

  return {
    relations,
    recordedDays: target.length,
    minDaysForComparison: MIN_DAYS_FOR_COMPARISON,
  };
}
