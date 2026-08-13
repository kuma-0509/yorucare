import type { MoodScore, StateLevel } from "./types";

const STATE_LEVEL_SCORES: Record<StateLevel, MoodScore[]> = {
  good: [4, 5],
  normal: [3],
  hard: [1, 2],
};

/** 3段階から5段階の総合気分を選ぶときの代表値。両端ではなく控えめな値を既定にする */
const STATE_LEVEL_DEFAULT_SCORE: Record<StateLevel, MoodScore> = {
  good: 4,
  normal: 3,
  hard: 2,
};

/** 5段階の総合気分から、記録開始時に選ぶ3段階（よい／ふつう／しんどい）を求める */
export function getStateLevelFromScore(
  score: MoodScore | null
): StateLevel | null {
  if (score === null) return null;
  for (const level of Object.keys(STATE_LEVEL_SCORES) as StateLevel[]) {
    if (STATE_LEVEL_SCORES[level].includes(score)) return level;
  }
  return null;
}

/** 3段階を選んだときに設定する総合気分の既定値。5段階側で選び直せば上書きされる */
export function getDefaultScoreForStateLevel(level: StateLevel): MoodScore {
  return STATE_LEVEL_DEFAULT_SCORE[level];
}
