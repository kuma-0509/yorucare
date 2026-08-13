import { MAX_GOAL_LENGTH } from "./schemas";
import type { DailyRecord } from "./types";

/**
 * 未達のときに出す補助質問。
 * 「なぜできなかったか」は理由の説明を求めることになるため聞かない。
 * 次に選べる大きさを本人が決められる形にする。
 */
export const GOAL_HELPER_QUESTIONS = [
  "時間を半分にすると、できそうですか？",
  "準備だけをやる形にできますか？",
  "回数を1回に減らすと、どうですか？",
] as const;

/** 提案文の末尾に付く語のうち、いちばん長いものの文字数 */
const MAX_SUFFIX_LENGTH = 8;

/**
 * 前日の記録から、この日にふりかえる目標を取り出す。
 *
 * 記録がない日や、目標を決めていない日は null を返す。
 * 未記録を「守れなかった」と読ませないため、ふりかえり自体を出さない。
 */
export function getGoalToReview(
  previousRecord: DailyRecord | null
): string | null {
  const goal = previousRecord?.tomorrowGoal.trim() ?? "";
  return goal.length > 0 ? goal : null;
}

/** 「散歩する」→「散歩」。提案文へ自然につなぐための語幹 */
function toActionBase(goal: string): string {
  const trimmed = goal.trim().replace(/[。．.]+$/, "");
  const withoutSuru =
    trimmed.length > 2 && trimmed.endsWith("する")
      ? trimmed.slice(0, -2)
      : trimmed;
  const limit = MAX_GOAL_LENGTH - MAX_SUFFIX_LENGTH;
  return withoutSuru.slice(0, limit);
}

/**
 * 未達だった目標を、より小さく具体的な行動へ言い換える案。
 *
 * 助言や評価ではなく、本人がそのまま翌日の目標に置ける文だけを返す。
 * 生成結果は `MAX_GOAL_LENGTH` に収まるため、そのまま保存できる。
 */
export function buildSmallerGoalSuggestions(goal: string): string[] {
  const base = toActionBase(goal);
  if (base.length === 0) return [];

  const suggestions = [
    `${base}を5分だけやる`,
    `${base}の準備だけする`,
    `${base}を1回だけやる`,
  ];

  const original = goal.trim();
  return [...new Set(suggestions)].filter(
    (suggestion) => suggestion !== original
  );
}
