import { countDaysInRange, indexRecordsByDate } from "./range";
import type {
  DailyRecord,
  GoalReviewStatus,
  MedicationStatus,
  MoodScore,
  WarningLevel,
} from "../types";

/**
 * 期間集計の結果型。
 *
 * この型には note / warningNote / selfCareMemo / tomorrowGoal を含めない。
 * 本人が書いた本文を端末外へ出さない方針を、運用ルールではなく型で保証するため。
 * 集計はすべてアプリ側で確定させ、LLM には計算させない。
 */

export type PeriodRange = {
  /** YYYY-MM-DD（この日を含む） */
  from: string;
  /** YYYY-MM-DD（この日を含む） */
  to: string;
};

export type MoodSummary = {
  /**
   * moodScore の平均（小数第1位まで）。
   * 対象日が0件のときは 0 ではなく null を返す。
   * 0 を返すと「気分が最低だった」と読まれるため、「データがない」と区別する。
   */
  averageScore: number | null;
  /** moodScore が入力されていた日数。averageScore の母数 */
  scoredDays: number;
  /** スコアごとの日数 */
  distribution: Record<MoodScore, number>;
};

export type SleepSummary = {
  /** sleepMinutes の平均（分・整数に丸め）。対象日が0件なら null */
  averageMinutes: number | null;
  /**
   * sleepMinutes の母標準偏差（分・整数に丸め）。
   * 観測した日そのもののばらつきを述べる用途なので、標本ではなく母標準偏差を使う。
   * 対象日が1件以下なら null
   */
  deviationMinutes: number | null;
  /** sleepMinutes が入力されていた日数。上記2つの母数 */
  measuredDays: number;
  /**
   * 就寝時刻の中央値（HH:MM）。対象日が0件なら null。
   * 日をまたぐため単純平均は使えない（23:00 と 01:00 の平均が 12:00 になる）。
   * 正午を境とする24時間の窓に写してから中央値を取る。
   */
  medianBedtime: string | null;
  /** sleepStart が入力されていた日数。medianBedtime の母数 */
  bedtimeDays: number;
};

export type MedicationSummary = {
  /** medication が入力されていた日数。donePercent の母数 */
  answeredDays: number;
  countByStatus: Record<MedicationStatus, number>;
  /** done の割合（0〜100の整数）。answeredDays が0なら null */
  donePercent: number | null;
};

export type WarningSummary = {
  /** warningLevel が入力されていた日数 */
  answeredDays: number;
  countByLevel: Record<WarningLevel, number>;
};

/**
 * 前日に決めた目標のふりかえり結果の集計。
 *
 * 数えるのは選択式の goalReviewStatus だけとし、本人が書いた目標の文面
 * （tomorrowGoal）は数えも持ちもしない。本文を端末外へ出さない方針を、
 * 運用ルールではなくこの型で保証する。
 */
export type GoalReviewSummary = {
  /**
   * goalReviewStatus が選ばれていた日数。countByStatus の母数。
   * 目標を決めた日数でも、記録があった日数でもない。
   * ふりかえりは任意なので、決めた目標より少なくなる。
   */
  answeredDays: number;
  countByStatus: Record<GoalReviewStatus, number>;
};

export type PeriodSummary = {
  range: PeriodRange;
  /** 期間の暦日数（from と to を含む） */
  daysInRange: number;
  /**
   * 記録があった日数。
   * これがないと、記録できないほどしんどかった期間がデータ上「平穏な期間」に見える。
   * すべての割合の解釈に必要なので必ず返す。
   */
  recordedDays: number;
  mood: MoodSummary;
  sleep: SleepSummary;
  medication: MedicationSummary;
  warning: WarningSummary;
  goalReview: GoalReviewSummary;
};

const MINUTES_PER_DAY = 24 * 60;
/** 正午。就寝時刻を「正午から翌正午まで」の窓に写すときの基準 */
const NOON = 12 * 60;

function parseTimeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesToTime(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarizeMood(records: DailyRecord[]): MoodSummary {
  const distribution: Record<MoodScore, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const scores: number[] = [];

  for (const record of records) {
    if (record.moodScore === null) continue;
    distribution[record.moodScore] += 1;
    scores.push(record.moodScore);
  }

  if (scores.length === 0) {
    return { averageScore: null, scoredDays: 0, distribution };
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return {
    averageScore: roundTo(total / scores.length, 1),
    scoredDays: scores.length,
    distribution,
  };
}

function summarizeSleep(records: DailyRecord[]): SleepSummary {
  const durations: number[] = [];
  const bedtimes: number[] = [];

  for (const record of records) {
    if (record.sleepMinutes !== null) durations.push(record.sleepMinutes);
    if (record.sleepStart !== null) {
      const minutes = parseTimeToMinutes(record.sleepStart);
      if (minutes !== null) {
        // 正午より前の時刻は翌日側として扱い、就寝時刻を一続きの窓に並べる
        bedtimes.push(minutes < NOON ? minutes + MINUTES_PER_DAY : minutes);
      }
    }
  }

  let averageMinutes: number | null = null;
  let deviationMinutes: number | null = null;

  if (durations.length > 0) {
    const mean = durations.reduce((sum, v) => sum + v, 0) / durations.length;
    averageMinutes = Math.round(mean);
    if (durations.length > 1) {
      const variance =
        durations.reduce((sum, v) => sum + (v - mean) ** 2, 0) / durations.length;
      deviationMinutes = Math.round(Math.sqrt(variance));
    }
  }

  let medianBedtime: string | null = null;
  if (bedtimes.length > 0) {
    const sorted = [...bedtimes].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 1
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2;
    medianBedtime = formatMinutesToTime(Math.round(median));
  }

  return {
    averageMinutes,
    deviationMinutes,
    measuredDays: durations.length,
    medianBedtime,
    bedtimeDays: bedtimes.length,
  };
}

function summarizeMedication(records: DailyRecord[]): MedicationSummary {
  const countByStatus: Record<MedicationStatus, number> = {
    done: 0,
    partial: 0,
    forgot: 0,
    none: 0,
  };
  let answeredDays = 0;

  for (const record of records) {
    if (record.medication === null) continue;
    countByStatus[record.medication] += 1;
    answeredDays += 1;
  }

  return {
    countByStatus,
    answeredDays,
    donePercent:
      answeredDays === 0
        ? null
        : Math.round((countByStatus.done / answeredDays) * 100),
  };
}

function summarizeWarning(records: DailyRecord[]): WarningSummary {
  const countByLevel: Record<WarningLevel, number> = {
    none: 0,
    small: 0,
    yes: 0,
  };
  let answeredDays = 0;

  for (const record of records) {
    if (record.warningLevel === null) continue;
    countByLevel[record.warningLevel] += 1;
    answeredDays += 1;
  }

  return { countByLevel, answeredDays };
}

function summarizeGoalReview(records: DailyRecord[]): GoalReviewSummary {
  const countByStatus: Record<GoalReviewStatus, number> = {
    done: 0,
    partial: 0,
    notDone: 0,
  };
  let answeredDays = 0;

  for (const record of records) {
    // 目標を決めていてもふりかえらなかった日は数えない。
    // ふりかえらなかったことを「できなかった」に寄せないため。
    if (record.goalReviewStatus === null) continue;
    countByStatus[record.goalReviewStatus] += 1;
    answeredDays += 1;
  }

  return { countByStatus, answeredDays };
}

/**
 * 期間内の記録を集計する。
 *
 * 数値はここで確定させ、LLM には計算させない。
 * 報告先が支援者や医師であり、数値の誤りが本人の不利益に直結するため、
 * 「LLM が計算できてしまう」ことを構造として塞ぐ。
 *
 * 記録は日付ごとに1件である前提だが、重複があっても日付単位で1件に畳む。
 */
export function summarizePeriod(
  records: DailyRecord[],
  from: string,
  to: string
): PeriodSummary {
  const target = [...indexRecordsByDate(records, from, to).values()];

  return {
    range: { from, to },
    daysInRange: countDaysInRange(from, to),
    recordedDays: target.length,
    mood: summarizeMood(target),
    sleep: summarizeSleep(target),
    medication: summarizeMedication(target),
    warning: summarizeWarning(target),
    goalReview: summarizeGoalReview(target),
  };
}
