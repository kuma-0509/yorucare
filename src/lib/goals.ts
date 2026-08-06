/**
 * 前日に決めた小さな行動を、次の日にふりかえるための判定と案。
 *
 * ルール:
 * - 記録がなかった日、目標を決めなかった日を失敗として扱わない。ふりかえりの
 *   問いかけは、前日に本人が決めた行動があるときだけ出す。
 * - 結果は本人が選ぶ3択だけで表し、評価語や助言を足さない。
 * - 未達のときの案は、行動の内容を書き換えず「小さくする幅」だけを添える。
 *   端末内の定型ルールで作り、外部へは何も送らない。
 */
import { MAX_GOAL_LENGTH } from "./schemas";
import type { DailyRecord, GoalResult } from "./types";

export const GOAL_RESULT_OPTIONS: { value: GoalResult; label: string }[] = [
  { value: "done", label: "できた" },
  { value: "partial", label: "一部できた" },
  { value: "missed", label: "できなかった" },
];

/** 行動を小さくする幅。内容そのものは本人の言葉のまま残す */
const SMALLER_STEP_SUFFIXES = ["（5分だけ）", "（1回だけ）", "（準備だけ）"];

export function getGoalResultLabel(result: GoalResult | null): string {
  if (result === null) return "";
  return GOAL_RESULT_OPTIONS.find((o) => o.value === result)?.label ?? "";
}

/**
 * その日にふりかえる行動を決める。
 * 結果を選んだあとは、選んだ時点の文（写し）を使う。
 */
export function getGoalToReview(
  form: Pick<DailyRecord, "goalResult" | "goalReviewedText">,
  previousDayGoal: string
): string {
  if (form.goalResult !== null) return form.goalReviewedText.trim();
  return previousDayGoal.trim();
}

/** 前日の記録から、ふりかえり対象になる行動を取り出す */
export function getPreviousDayGoal(record: DailyRecord | null): string {
  return record?.goal.trim() ?? "";
}

/** 「できた」以外のときだけ、次を小さくする案を出す */
export function needsSmallerStep(result: GoalResult | null): boolean {
  return result === "partial" || result === "missed";
}

/**
 * 行動を小さくした案。
 * すでに同じ幅が付いている案と、長さの上限を超える案は出さない。
 */
export function buildSmallerStepSuggestions(text: string): string[] {
  const base = text.trim();
  if (base === "") return [];

  return SMALLER_STEP_SUFFIXES.filter((suffix) => !base.endsWith(suffix))
    .map((suffix) => `${base}${suffix}`)
    .filter((suggestion) => suggestion.length <= MAX_GOAL_LENGTH);
}
