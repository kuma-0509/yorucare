import {
  WARNING_TAGS_MOOD,
  WARNING_TAGS_SLEEP,
  WARNING_TAGS_WORK,
} from "./constants";
import type { StateLevel } from "./types";

/**
 * 「自分メンテ」の提案は定型ルールだけで組み、LLMも外部通信も使わない。
 *
 * `docs/phase2-plan.md` 5節の「自分メンテの提案は、診断、危機判定、治療提案ではなく、
 * 本人が選べる一般的なセルフケア案に限定する」に従う。
 * ここに置く文は、症状への対処ではなく、誰でもその日に選べる行動だけにする。
 * 入力は選択式（3段階の状態と、しんどさのサインのタグ）に限り、
 * 本人が書いた自由記述は受け取らない。
 */

/** 1回に出す案の上限。選ぶ負担を増やさないため、多くても4件に抑える */
export const MAX_SELF_CARE_SUGGESTIONS = 4;

/** 3段階の状態から出す案。状態は記録の入口で必ず選ぶため、これが基本になる */
const BY_STATE_LEVEL: Record<StateLevel, readonly string[]> = {
  good: ["好きな音楽を聴く", "行きたい場所を調べる", "明日の準備を少しだけする"],
  normal: ["少し外の空気を吸う", "肩を10回まわす", "早めに布団に入る"],
  hard: ["横になって10分休む", "温かい飲みものを飲む", "今日の予定をひとつ減らす"],
};

/**
 * しんどさのサインのタグから足す案。
 * タグと1対1で対応させず、タグの区分ごとにまとめて足す。
 * 個々のサインに対する処置の提示に読ませないため。
 * 「その他」は内容が分からないため、案を変えない。
 */
const BY_WARNING_TAG_GROUP: {
  tags: readonly string[];
  suggestions: readonly string[];
}[] = [
  {
    tags: WARNING_TAGS_SLEEP,
    suggestions: ["布団に入る時間を15分早める", "寝る前にスマホを置く"],
  },
  {
    tags: WARNING_TAGS_MOOD,
    suggestions: ["ゆっくり3回、息を吐く", "今の気持ちを1行だけ書く"],
  },
  {
    tags: WARNING_TAGS_WORK,
    suggestions: ["今日やることをひとつに絞る", "5分だけ区切って手をつける"],
  },
];

/**
 * 記録した状態から、その日に選べそうなセルフケア案を組み立てる。
 *
 * 状態を選んでいない日は空配列を返し、カード自体を出さない。
 * タグ由来の案を先に並べつつ、状態由来の案が1件は必ず残るように上限を配分する。
 * 同じ入力からは常に同じ並びを返す。
 */
export function buildSelfCareSuggestions(
  stateLevel: StateLevel | null,
  warningTags: readonly string[]
): string[] {
  if (stateLevel === null) return [];

  const tagged = BY_WARNING_TAG_GROUP.filter((group) =>
    group.tags.some((tag) => warningTags.includes(tag))
  ).flatMap((group) => group.suggestions);

  const merged = [
    ...tagged.slice(0, MAX_SELF_CARE_SUGGESTIONS - 1),
    ...BY_STATE_LEVEL[stateLevel],
  ];
  return [...new Set(merged)].slice(0, MAX_SELF_CARE_SUGGESTIONS);
}
