import {
  MOVEMENT_CAUTIONS,
  MOVEMENT_OPTIONS,
  MOVEMENT_THRESHOLDS,
  REST_OPTION,
  type MovementLevel,
  type MovementOption,
} from "./movement-config";
import type { DailyRecord } from "../types";

/**
 * その日の記録から、負担の軽い順に運動の候補を並べる。
 *
 * これは提案であって処方ではない。次のことをしない。
 *
 * 1. 状態を判定しない。「今日は動けない日です」のような断定を出さない。
 * 2. 実施・未実施を保存しない。達成率や連続日数として集計しない。
 *    そのため、この層に書き込みの手段を用意しない。
 * 3. 「今日は休む」を代替として扱わない。常に先頭の、対等な選択肢として返す。
 *
 * 記録がない日は状態を推定せず、軽いほうへ倒す。
 * 「記録がないからできなかった」とは扱わない。
 */

export type MovementSuggestion = {
  /** 常に返す。表示側でも他の候補と同じ大きさで置く */
  restOption: MovementOption;
  /** レベル1以上の候補。負担の軽い順 */
  options: MovementOption[];
  /** 並べた候補の上限レベル */
  maxLevel: MovementLevel;
  /** その日の記録があるか */
  hasRecord: boolean;
  /**
   * 上限を決めたときに見た、本人の記録の事実。
   * 状態のラベルではなく、記録された値そのものを述べる。
   */
  basis: string[];
  cautions: string[];
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

/**
 * 上限レベルを決める。
 *
 * 複数の条件に当てはまるときは、最も軽い上限を採用する。
 * 「重い候補を出さない」側の誤りは本人の負担にならないため。
 */
function decideMaxLevel(record: DailyRecord | null): {
  maxLevel: MovementLevel;
  basis: string[];
} {
  if (record === null) {
    return { maxLevel: MOVEMENT_THRESHOLDS.maxLevelWithoutRecord, basis: [] };
  }

  const basis: string[] = [];
  let maxLevel: MovementLevel = 3;

  const lower = (level: MovementLevel) => {
    if (level < maxLevel) maxLevel = level;
  };

  if (
    record.warningLevel !== null &&
    MOVEMENT_THRESHOLDS.restingWarningLevels.includes(record.warningLevel)
  ) {
    basis.push("しんどさのサインを「あり」と記録した日です。");
    lower(1);
  } else if (
    record.warningLevel !== null &&
    MOVEMENT_THRESHOLDS.lightWarningLevels.includes(record.warningLevel)
  ) {
    basis.push("しんどさのサインを「少しあり」と記録した日です。");
    lower(2);
  }

  if (
    record.moodScore !== null &&
    record.moodScore <= MOVEMENT_THRESHOLDS.restingMoodAtMost
  ) {
    basis.push("気分を「少ししんどい」以下で記録した日です。");
    lower(1);
  }

  if (
    record.sleepMinutes !== null &&
    record.sleepMinutes <= MOVEMENT_THRESHOLDS.lightSleepMinutesAtMost
  ) {
    basis.push(
      `睡眠時間を${formatDuration(
        MOVEMENT_THRESHOLDS.lightSleepMinutesAtMost
      )}以下で記録した日です。`
    );
    lower(2);
  }

  return { maxLevel, basis };
}

export function suggestMovement(record: DailyRecord | null): MovementSuggestion {
  const { maxLevel, basis } = decideMaxLevel(record);

  return {
    restOption: REST_OPTION,
    options: MOVEMENT_OPTIONS.filter(
      (option) => option.level >= 1 && option.level <= maxLevel
    ).sort((a, b) => a.level - b.level),
    maxLevel,
    hasRecord: record !== null,
    basis,
    cautions: MOVEMENT_CAUTIONS,
  };
}
