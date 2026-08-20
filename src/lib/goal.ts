import { GOAL_REVIEW_OPTIONS } from "./constants";
import { COPY } from "./copy";
import { MAX_GOAL_LENGTH } from "./schemas";
import type { DailyRecord, GoalReviewStatus } from "./types";

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

/**
 * 保存済みの目標を、そのまま画面へ出せる文にする。
 *
 * 決めていない日は空文字を返さず、決めていないと読める文を返す。
 * 「まだ決めていない」と「この画面には出していない」を取り違えないようにする。
 */
export function formatSavedGoal(goal: string): string {
  const trimmed = goal.trim();
  return trimmed.length > 0 ? trimmed : COPY.goal.notSet;
}

/** ふりかえりの結果の表示名。選んでいない日は null（行そのものを出さない） */
export function getGoalReviewLabel(
  status: GoalReviewStatus | null
): string | null {
  if (status === null) return null;
  return GOAL_REVIEW_OPTIONS.find((o) => o.value === status)?.label ?? null;
}

/**
 * 記録から、目標まわりを読み返すための表示行を作る。
 *
 * 目標の行は常に返し、決めていない日も空状態の文で埋める。
 * ふりかえりの行は、その日に結果を選んだときだけ足す。
 */
export function buildGoalSummaryLines(
  record: Pick<DailyRecord, "tomorrowGoal" | "goalReviewStatus">
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [
    {
      label: COPY.goal.fieldOther,
      value: formatSavedGoal(record.tomorrowGoal),
    },
  ];

  const reviewLabel = getGoalReviewLabel(record.goalReviewStatus);
  if (reviewLabel) {
    lines.push({ label: COPY.goal.reviewResultLabel, value: reviewLabel });
  }

  return lines;
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
