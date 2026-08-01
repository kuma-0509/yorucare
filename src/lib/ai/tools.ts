import { buildDailyViews, type DailyView } from "./daily-view";
import {
  getSelfCareDictionary,
  listSelfCare,
  listWarningTags,
  type FrequencyResult,
} from "./frequency";
import { summarizePeriod, type PeriodSummary } from "./period-summary";
import {
  relateSelfCareToMood,
  type SelfCareRelationResult,
} from "./self-care-relation";
import { findStreaks, type StreakCondition, type StreakResult } from "./streaks";
import { getLast7Days } from "../dates";
import { repository } from "../repository";
import { ok, type Result } from "../result";
import type { DailyRecord, SelfCareItem } from "../types";

/**
 * AI機能から呼ぶツールの入口。
 *
 * ここに置くのは読み取りだけで、保存や削除のツールは用意しない。
 * LLMに書き込み手段を渡さず、下書きまでに留めて確定は本人のボタン操作にする。
 *
 * 集計そのものは純関数側にあり、この層は保存先からの読み出しと
 * Result 境界の受け渡しだけを担う。保存先が API に変わっても
 * 集計の実装は変えずに済む。
 */

async function loadAll(): Promise<
  Result<{ records: DailyRecord[]; selfCareItems: SelfCareItem[] }>
> {
  const records = await repository.getAllRecords();
  if (!records.ok) return records;
  const selfCareItems = await repository.getAllSelfCareItems();
  if (!selfCareItems.ok) return selfCareItems;
  return ok({ records: records.value, selfCareItems: selfCareItems.value });
}

export async function getPeriodSummary(
  from: string,
  to: string
): Promise<Result<PeriodSummary>> {
  const records = await repository.getAllRecords();
  if (!records.ok) return records;
  return ok(summarizePeriod(records.value, from, to));
}

export async function getDailyViews(
  from: string,
  to: string
): Promise<Result<DailyView[]>> {
  const loaded = await loadAll();
  if (!loaded.ok) return loaded;
  return ok(
    buildDailyViews(loaded.value.records, loaded.value.selfCareItems, from, to)
  );
}

export async function getWarningTagFrequency(
  from: string,
  to: string
): Promise<Result<FrequencyResult>> {
  const records = await repository.getAllRecords();
  if (!records.ok) return records;
  return ok(listWarningTags(records.value, from, to));
}

export async function getSelfCareFrequency(
  from: string,
  to: string
): Promise<Result<FrequencyResult>> {
  const loaded = await loadAll();
  if (!loaded.ok) return loaded;
  return ok(
    listSelfCare(loaded.value.records, loaded.value.selfCareItems, from, to)
  );
}

export async function getSelfCareDictionaryTitles(): Promise<Result<string[]>> {
  const items = await repository.getAllSelfCareItems();
  if (!items.ok) return items;
  return ok(getSelfCareDictionary(items.value));
}

export async function getStreaks(
  from: string,
  to: string,
  condition: StreakCondition,
  minDays: number
): Promise<Result<StreakResult>> {
  const records = await repository.getAllRecords();
  if (!records.ok) return records;
  return ok(findStreaks(records.value, from, to, condition, minDays));
}

export async function getSelfCareRelation(
  from: string,
  to: string
): Promise<Result<SelfCareRelationResult>> {
  const loaded = await loadAll();
  if (!loaded.ok) return loaded;
  return ok(
    relateSelfCareToMood(
      loaded.value.records,
      loaded.value.selfCareItems,
      from,
      to
    )
  );
}

export type RecentContext = {
  range: { from: string; to: string };
  /** 直近7日の記録。本文は含まない */
  days: DailyView[];
  /** 本人が登録した「できること」。提案はこの範囲内から選ぶ */
  selfCareDictionary: string[];
};

/**
 * 毎回コンテキストへ同梱する分。
 *
 * 直近7日と「できること」辞書は、ほぼどの問いでも必要になるうえ量が小さい。
 * 都度ツールで取りに行かせると往復が増えるだけなので同梱する。
 * 1か月以上の長期データと集計値は、必要なときだけツールで取りに行かせる。
 */
export async function buildRecentContext(): Promise<Result<RecentContext>> {
  const loaded = await loadAll();
  if (!loaded.ok) return loaded;

  const days = getLast7Days();
  const from = days[0];
  const to = days[days.length - 1];

  return ok({
    range: { from, to },
    days: buildDailyViews(
      loaded.value.records,
      loaded.value.selfCareItems,
      from,
      to
    ),
    selfCareDictionary: getSelfCareDictionary(loaded.value.selfCareItems),
  });
}
