import { indexRecordsByDate } from "./range";
import type { DailyRecord, SelfCareItem } from "../types";

/**
 * 頻度集計。並べ替えと絞り込みはアプリ側の仕事で、LLMには数えさせない。
 */

export type FrequencyEntry = {
  /** 選択式のタグ、または「できること」のタイトル */
  name: string;
  /** その語が現れた日数。同じ日に重複していても1日として数える */
  days: number;
};

export type FrequencyResult = {
  entries: FrequencyEntry[];
  /**
   * 集計の母数となった、記録があった日数。
   * これがないと「3日に出た」が多いのか少ないのか判断できない。
   */
  recordedDays: number;
};

/**
 * 同順位のときに並びが実行ごとに変わると、LLMの出力もぶれる。
 * 日数の降順、同数なら名前の昇順で固定する。
 */
function sortEntries(counts: Map<string, number>): FrequencyEntry[] {
  return [...counts.entries()]
    .map(([name, days]) => ({ name, days }))
    .sort((a, b) => (b.days - a.days) || a.name.localeCompare(b.name, "ja"));
}

/** 警告サインのタグを頻度順に並べる */
export function listWarningTags(
  records: DailyRecord[],
  from: string,
  to: string
): FrequencyResult {
  const target = [...indexRecordsByDate(records, from, to).values()];
  const counts = new Map<string, number>();

  for (const record of target) {
    // 同じ日に同じタグが重複していても1日として数える
    for (const tag of new Set(record.warningTags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return { entries: sortEntries(counts), recordedDays: target.length };
}

/**
 * 実行した「できること」をタイトルに解決して頻度順に並べる。
 * 辞書から削除された項目は解決できないため除く。
 */
export function listSelfCare(
  records: DailyRecord[],
  selfCareItems: SelfCareItem[],
  from: string,
  to: string
): FrequencyResult {
  const target = [...indexRecordsByDate(records, from, to).values()];
  const titleById = new Map(selfCareItems.map((item) => [item.id, item.title]));
  const counts = new Map<string, number>();

  for (const record of target) {
    for (const id of new Set(record.selfCareIds)) {
      const title = titleById.get(id);
      if (title === undefined) continue;
      counts.set(title, (counts.get(title) ?? 0) + 1);
    }
  }

  return { entries: sortEntries(counts), recordedDays: target.length };
}

/**
 * 本人が登録した「できること」の一覧。
 *
 * セルフケアの提案はこの範囲内から選ばせる。
 * 範囲外の提案は、本人がまだできないことを新しく求めることになり負荷になる。
 *
 * 「控えたいこと」は除く。控えたい行動を提案の候補に入れないため。
 */
export function getSelfCareDictionary(selfCareItems: SelfCareItem[]): string[] {
  return selfCareItems
    .filter((item) => item.kind === "care")
    .map((item) => item.title);
}
