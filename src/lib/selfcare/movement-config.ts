import type { MoodScore, WarningLevel } from "../types";

/**
 * 運動の選択肢と、どこまでを並べるかの閾値。
 *
 * 閾値をコードへ散らさず1か所に置く。
 * ここにあるのは「どこまで負担の軽いものだけを並べるか」の区切りであり、
 * 本人の状態を判定する基準ではない。
 * 迷ったら軽いほうへ倒す。重い候補を出さないことで困る人はいないが、
 * しんどい日に重い候補が並ぶと、選ばないこと自体が負担になる。
 */

/** 0=休む / 1=1〜3分 / 2=5〜10分 / 3=10〜30分 */
export type MovementLevel = 0 | 1 | 2 | 3;

export type MovementOption = {
  id: string;
  level: MovementLevel;
  /** 「〜しましょう」にしない。動詞の言い切りにとどめる */
  title: string;
  /** 目安の時間 */
  duration: string;
  description: string;
};

export const MOVEMENT_THRESHOLDS = {
  /** これ以下の気分スコアが記録された日は、レベル1までにする */
  restingMoodAtMost: 2 as MoodScore,
  /** これらのしんどさのサインが記録された日は、レベル1までにする */
  restingWarningLevels: ["yes"] as WarningLevel[],
  /** これらのしんどさのサインが記録された日は、レベル2までにする */
  lightWarningLevels: ["small"] as WarningLevel[],
  /** これ以下の睡眠時間（分）が記録された日は、レベル2までにする */
  lightSleepMinutesAtMost: 300,
  /**
   * その日の記録がない場合の上限。
   * 記録がないことから状態を推定しないため、軽いほうへ倒して1にする。
   */
  maxLevelWithoutRecord: 1 as MovementLevel,
} as const;

/** レベル0。代替ではなく対等な選択肢として、常に最初に置く */
export const REST_OPTION: MovementOption = {
  id: "rest-today",
  level: 0,
  title: "今日は休む",
  duration: "時間の目安なし",
  description:
    "何もしないことも選択肢のひとつです。選んでも選ばなくても記録には影響しません。",
};

export const MOVEMENT_OPTIONS: MovementOption[] = [
  {
    id: "deep-breath",
    level: 1,
    title: "深呼吸をする",
    duration: "1〜3分",
    description: "座ったまま、息をゆっくり吐くところから。",
  },
  {
    id: "shoulder-roll",
    level: 1,
    title: "肩を回す",
    duration: "1〜3分",
    description: "前と後ろに数回ずつ。痛みが出ない範囲で。",
  },
  {
    id: "drink-water",
    level: 1,
    title: "水分を取る",
    duration: "1〜3分",
    description: "コップ1杯ぶん。温かいものでも冷たいものでも。",
  },
  {
    id: "open-window",
    level: 1,
    title: "窓を開ける",
    duration: "1〜3分",
    description: "外の空気を入れて、少しのあいだ外を眺める。",
  },
  {
    id: "indoor-stretch",
    level: 2,
    title: "室内でストレッチをする",
    duration: "5〜10分",
    description: "立っても座ってもできます。反動をつけずにゆっくり。",
  },
  {
    id: "short-walk-around-home",
    level: 2,
    title: "家の周りを短く歩く",
    duration: "5〜10分",
    description: "行き先を決めず、途中で引き返しても大丈夫です。",
  },
  {
    id: "walking",
    level: 3,
    title: "ウォーキングをする",
    duration: "10〜30分",
    description: "歩く速さも距離も、その日の体調に合わせて選べます。",
  },
  {
    id: "park-walk",
    level: 3,
    title: "公園まで散歩する",
    duration: "10〜30分",
    description: "近くの公園まで歩き、ベンチで休んで帰ることもできます。",
  },
  {
    id: "sports-facility",
    level: 3,
    title: "近隣のスポーツ施設を使う",
    duration: "10〜30分",
    description: "利用時間や料金は、行く前に施設の公式ページで確認できます。",
  },
];

/** 提案に必ず添える注意。処方ではないことをここで明示する */
export const MOVEMENT_CAUTIONS: string[] = [
  "体調が悪いときは中止してください。",
  "痛みや息苦しさがあるときは、医療機関へ相談してください。",
  "持病や治療中の内容によって向き不向きがあります。判断は主治医と一緒に行ってください。",
];
