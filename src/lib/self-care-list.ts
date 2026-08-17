import { STATE_LEVEL_OPTIONS } from "./constants";
import type { SelfCareItem, SelfCareItemKind, StateLevel } from "./types";

/**
 * 登録簿の絞り込み。
 *
 * どの状態のときに出すかは本人が登録時に決めるものとし、アプリ側では推定しない。
 * ここでやるのは、本人が指定した状態と、その日に本人が選んだ状態を突き合わせることだけ。
 * 判断や助言を足さないため、並び順も登録順のまま変えない。
 */

/**
 * この項目を、その日の状態のときに出すかどうか。
 *
 * 状態を指定していない項目は、いつでも出す（版3以前の登録はすべてこれになる）。
 * 状態を指定した項目は、その状態を選んだ日にだけ出す。
 * 状態が未選択の日は、指定つきの項目を出さない。合致する状態がないため。
 */
export function matchesStateLevel(
  item: SelfCareItem,
  stateLevel: StateLevel | null
): boolean {
  if (item.stateLevels.length === 0) return true;
  if (stateLevel === null) return false;
  return item.stateLevels.includes(stateLevel);
}

/** 種別と状態で登録簿を絞り込む。並びは登録順のまま */
export function selectItemsForState(
  items: SelfCareItem[],
  kind: SelfCareItemKind,
  stateLevel: StateLevel | null
): SelfCareItem[] {
  return items.filter(
    (item) => item.kind === kind && matchesStateLevel(item, stateLevel)
  );
}

/**
 * 「今日できたこと」に出す候補。
 *
 * 状態に合う項目に加えて、すでにその日に選んである項目を必ず残す。
 * 状態を選び直したときに、選択済みの項目が画面から消えたまま保存されるのを防ぐ。
 */
export function selectCareItemsForRecord(
  items: SelfCareItem[],
  stateLevel: StateLevel | null,
  selectedIds: string[]
): SelfCareItem[] {
  return items.filter(
    (item) =>
      item.kind === "care" &&
      (matchesStateLevel(item, stateLevel) || selectedIds.includes(item.id))
  );
}

/** 一覧で状態を示すときの言い方。選択肢の label をそのまま使うと日本語が崩れるため別に持つ */
const STATE_LEVEL_DAY_LABELS: Record<StateLevel, string> = {
  good: "よい日",
  normal: "ふつうの日",
  hard: "しんどい日",
};

/** 登録簿の一覧で、どの状態のときに出すかを短く示す */
export function describeStateLevels(levels: StateLevel[]): string {
  if (levels.length === 0) return "いつでも";
  // 「よい・ふつう・しんどい」の並びを保ち、選んだ順による揺れをなくす
  return STATE_LEVEL_OPTIONS.filter(({ value }) => levels.includes(value))
    .map(({ value }) => STATE_LEVEL_DAY_LABELS[value])
    .join("・");
}
