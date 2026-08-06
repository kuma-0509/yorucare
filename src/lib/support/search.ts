import { getSupportAvailability, type SupportAvailability } from "./availability";
import type {
  ConsultationMethod,
  SupportCategory,
  SupportResource,
  SupportUrgency,
} from "./types";

/**
 * 支援先の絞り込みと並べ替え。
 *
 * 条件はすべて本人が選ぶ。記録から条件を組み立てる関数はここに置かない。
 * 「いつ相談したいか」（緊急度）も本人の選択であり、
 * アプリが入力内容から推定した値を渡してはいけない。
 */

export type SupportSearchQuery = {
  /** 本人が選んだ市区町村。未指定なら都内すべて */
  municipality?: string;
  /** 相談したい内容 */
  category?: SupportCategory;
  /** 相談方法 */
  method?: ConsultationMethod;
  /** いつ相談したいか。絞り込みではなく並び順にだけ使う */
  urgency?: SupportUrgency;
};

export type SupportSearchItem = {
  resource: SupportResource;
  availability: SupportAvailability;
};

/**
 * 緊急度は絞り込みに使わない。
 *
 * 「今すぐ」で絞ると、受付時間外の時間帯に候補が0件になりうる。
 * 選べる先がない画面を出すより、順番を変えて全部見せるほうが安全。
 */
function urgencyRank(
  urgency: SupportUrgency | undefined,
  availability: SupportAvailability
): number {
  if (urgency === undefined || urgency === "withinDays") return 0;

  if (urgency === "now") {
    if (availability.status === "open24Hours") return 0;
    if (availability.isOpenNow) return 1;
    return 2;
  }

  // "today": 本日中に受け付けているか、この後に受付が始まるか
  if (availability.isOpenNow) return 0;
  if (availability.nextOpening?.daysAhead === 0) return 1;
  return 2;
}

function openRank(availability: SupportAvailability): number {
  if (availability.isOpenNow) return 0;
  if (availability.status === "unknown") return 1;
  return 2;
}

function municipalityRank(
  query: SupportSearchQuery,
  resource: SupportResource
): number {
  if (!query.municipality) return 0;
  if (resource.municipality === query.municipality) return 0;
  // 都全域が対象の窓口は、市区町村を選んでいても候補として残す
  return resource.municipality === undefined ? 1 : 2;
}

function categoryRank(
  query: SupportSearchQuery,
  resource: SupportResource
): number {
  if (!query.category) return 0;
  return resource.category === query.category ? 0 : 1;
}

function matchesFilters(
  resource: SupportResource,
  query: SupportSearchQuery
): boolean {
  if (
    query.municipality &&
    resource.municipality !== undefined &&
    resource.municipality !== query.municipality
  ) {
    return false;
  }
  if (query.category && resource.category !== query.category) return false;
  if (query.method && !resource.consultationMethod.includes(query.method)) {
    return false;
  }
  return true;
}

/**
 * 支援先を絞り込み、並べ替える。
 *
 * 並び順:
 * 1. 本人が選んだ緊急度との適合
 * 2. 現在受付中か
 * 3. 市区町村の適合
 * 4. 相談内容の適合
 *
 * 同順位は id 昇順で固定する。表示順が実行のたびに変わると、
 * 同じ操作をしても違う窓口が上に来て、本人が前回見た先を探せなくなる。
 */
export function searchSupportResources(
  resources: SupportResource[],
  query: SupportSearchQuery,
  now: Date
): SupportSearchItem[] {
  return resources
    .filter((resource) => matchesFilters(resource, query))
    .map((resource) => ({
      resource,
      availability: getSupportAvailability(resource, now),
    }))
    .sort((a, b) => {
      const keys: [number, number][] = [
        [urgencyRank(query.urgency, a.availability), urgencyRank(query.urgency, b.availability)],
        [openRank(a.availability), openRank(b.availability)],
        [municipalityRank(query, a.resource), municipalityRank(query, b.resource)],
        [categoryRank(query, a.resource), categoryRank(query, b.resource)],
      ];
      for (const [left, right] of keys) {
        if (left !== right) return left - right;
      }
      return a.resource.id.localeCompare(b.resource.id);
    });
}

/** 絞り込み用に、データへ実際に入っている市区町村を昇順で並べる */
export function listMunicipalities(resources: SupportResource[]): string[] {
  const names = new Set<string>();
  for (const resource of resources) {
    if (resource.municipality) names.add(resource.municipality);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ja"));
}
