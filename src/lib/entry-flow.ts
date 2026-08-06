/**
 * 記録の入口（3段階）と、そのあとに出す追加質問の決め方。
 *
 * 3段階は保存する値そのものではなく、5段階の総合気分（moodScore）への入口。
 * 保存されるデータ構造は従来のままで、記録の粒度は変わらない。
 *
 * ルール:
 * - 段階が同じなら、すでに入っている5段階の値を上書きしない。
 * - 「しんどい」を選んでも、追加で書くことを求める文言は出さない（表示の出し分けだけ）。
 * - すでに書いてある記録は、入口の選択に関係なく隠さない。
 */
import type { DailyRecord, MoodScore } from "./types";

export type ConditionLevel = "good" | "normal" | "hard";

/** 入口の選択に応じて最初から見せる項目 */
export type FollowUpSection = "warningSign" | "selfCare";

type OptionalDetailFields = Pick<
  DailyRecord,
  "moodLabels" | "sleepStart" | "sleepEnd" | "medication" | "note"
>;

type WarningFields = Pick<
  DailyRecord,
  "warningLevel" | "warningTags" | "warningNote"
>;

type SelfCareFields = Pick<DailyRecord, "selfCareIds" | "selfCareMemo">;

type GoalFields = Pick<DailyRecord, "goal">;

type EntryFormFields = Pick<DailyRecord, "moodScore"> &
  OptionalDetailFields &
  WarningFields &
  SelfCareFields &
  GoalFields;

/** 3段階から入ったときに入る総合気分 */
const CONDITION_MOOD_SCORE: Record<ConditionLevel, MoodScore> = {
  good: 4,
  normal: 3,
  hard: 2,
};

export function moodScoreForCondition(level: ConditionLevel): MoodScore {
  return CONDITION_MOOD_SCORE[level];
}

export function conditionFromMoodScore(
  score: MoodScore | null
): ConditionLevel | null {
  if (score === null) return null;
  if (score >= 4) return "good";
  if (score === 3) return "normal";
  return "hard";
}

/**
 * 3段階を選んだときの総合気分を決める。
 * すでに同じ段階の値が入っている場合は、5段階で選んだ細かさを保つ。
 */
export function applyCondition(
  current: MoodScore | null,
  level: ConditionLevel
): MoodScore {
  if (current !== null && conditionFromMoodScore(current) === level) {
    return current;
  }
  return moodScoreForCondition(level);
}

/**
 * 入口の選択に応じて、最初から見せる項目を決める。
 * 表示順もこの並びに従う。
 */
export function getFollowUpSections(
  level: ConditionLevel | null
): readonly FollowUpSection[] {
  if (level === null) return [];
  if (level === "hard") return ["warningSign", "selfCare"];
  return ["selfCare"];
}

export function hasOptionalDetailInput(form: OptionalDetailFields): boolean {
  return (
    form.moodLabels.length > 0 ||
    Boolean(form.sleepStart) ||
    Boolean(form.sleepEnd) ||
    form.medication !== null ||
    form.note.trim() !== ""
  );
}

export function hasWarningInput(form: WarningFields): boolean {
  return (
    form.warningLevel !== null ||
    form.warningTags.length > 0 ||
    form.warningNote.trim() !== ""
  );
}

/**
 * 入口が未選択でも、すでに書いてある記録は隠さない。
 * 過去の記録を開き直したときに、入力済みの項目が見えなくなるのを防ぐ。
 */
export function shouldRevealFollowUps(form: EntryFormFields): boolean {
  return (
    form.moodScore !== null ||
    hasOptionalDetailInput(form) ||
    hasWarningInput(form) ||
    form.selfCareIds.length > 0 ||
    form.selfCareMemo.trim() !== "" ||
    form.goal.trim() !== ""
  );
}
