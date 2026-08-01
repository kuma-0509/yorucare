import { enumerateDates, indexRecordsByDate } from "./range";
import type {
  DailyRecord,
  MedicationStatus,
  MoodScore,
  WarningLevel,
} from "../types";

/**
 * 連続日数の検出。
 *
 * 条件は自由な式ではなく閉じた集合として定義する。
 * 任意の条件を受け取れるようにすると、呼び出し側や将来のLLM連携で
 * 意図しない切り口が作られ、何を数えたのかを説明できなくなるため。
 */
export type StreakCondition =
  /** 記録があった日 */
  | { metric: "recorded" }
  | { metric: "moodScore"; comparison: "atLeast" | "atMost"; value: MoodScore }
  | { metric: "sleepMinutes"; comparison: "atLeast" | "atMost"; value: number }
  | { metric: "medication"; statuses: MedicationStatus[] }
  | { metric: "warningLevel"; levels: WarningLevel[] };

export type Streak = {
  /** YYYY-MM-DD（この日を含む） */
  from: string;
  /** YYYY-MM-DD（この日を含む） */
  to: string;
  days: number;
};

export type StreakResult = {
  condition: StreakCondition;
  /** minDays 以上続いた区間だけを、開始日の昇順で返す */
  streaks: Streak[];
  /** 条件を満たした日の総数。連続していない日も含む */
  matchedDays: number;
  /**
   * 期間内で記録がなかった日数。
   * 連続が途切れた理由が「条件を満たさなかった」のか
   * 「記録がなかった」のかを区別できるようにする。
   */
  unrecordedDays: number;
};

function matches(record: DailyRecord | undefined, condition: StreakCondition): boolean {
  // 未記録日は条件を満たしたとみなさない。
  // 記録がない日を満たしたことにすると、記録できなかった期間が
  // 「好調が続いた期間」に化ける。
  if (!record) return false;

  switch (condition.metric) {
    case "recorded":
      return true;
    case "moodScore":
      if (record.moodScore === null) return false;
      return condition.comparison === "atLeast"
        ? record.moodScore >= condition.value
        : record.moodScore <= condition.value;
    case "sleepMinutes":
      if (record.sleepMinutes === null) return false;
      return condition.comparison === "atLeast"
        ? record.sleepMinutes >= condition.value
        : record.sleepMinutes <= condition.value;
    case "medication":
      if (record.medication === null) return false;
      return condition.statuses.includes(record.medication);
    case "warningLevel":
      if (record.warningLevel === null) return false;
      return condition.levels.includes(record.warningLevel);
    default:
      return false;
  }
}

/**
 * 条件を満たす日が minDays 以上続いた区間を探す。
 *
 * 記録がない日も1日として走査するため、記録の抜けは連続を途切れさせる。
 */
export function findStreaks(
  records: DailyRecord[],
  from: string,
  to: string,
  condition: StreakCondition,
  minDays: number
): StreakResult {
  const byDate = indexRecordsByDate(records, from, to);
  const dates = enumerateDates(from, to);
  const threshold = Math.max(1, Math.floor(minDays));

  const streaks: Streak[] = [];
  let matchedDays = 0;
  let unrecordedDays = 0;
  let runStart: string | null = null;
  let runLength = 0;

  const closeRun = (endDate: string) => {
    if (runStart !== null && runLength >= threshold) {
      streaks.push({ from: runStart, to: endDate, days: runLength });
    }
    runStart = null;
    runLength = 0;
  };

  let previousDate: string | null = null;
  for (const date of dates) {
    const record = byDate.get(date);
    if (!record) unrecordedDays += 1;

    if (matches(record, condition)) {
      matchedDays += 1;
      if (runStart === null) runStart = date;
      runLength += 1;
    } else if (previousDate !== null) {
      closeRun(previousDate);
    }
    previousDate = date;
  }
  if (previousDate !== null) closeRun(previousDate);

  return { condition, streaks, matchedDays, unrecordedDays };
}
