/**
 * 需要（いつ支援が必要か）と供給（いつ窓口が開いているか）を突き合わせ、
 * 支援の空白を曜日×時間帯で表すロジック。
 *
 * 需要側の公的統計は、曜日別の表と時間帯別の表が別々に提供されることが多い。
 * その場合、曜日×時間帯の同時分布は分からない。周辺分布の積で埋めることは
 * できるが、それは「曜日と時間帯が独立」という仮定を置いたことになる。
 *
 * この層は、その仮定を隠さないことを最優先にしている。実測されたセルと
 * 推定したセルを `basis` で区別し、最後まで別の値として持ち回る。
 * 確からしさの違う数値を同じ見た目にしないことを、運用ルールではなく
 * データ構造で守るための設計。
 *
 * なお需要側の統計は「支援を要する状態がいつ起きているか」を示す用途に限る。
 * ヨルケアがそれを減らすという主張には使わない（`docs/odhackathon2026-data-narrative.md`）。
 */

import {
  countOpenAt,
  MINUTES_PER_DAY,
  type Facility,
  type OpenCount,
  type Weekday,
} from "./opening-hours";

/** 需要値の由来 */
export type DemandBasis =
  /** 曜日×時間帯の同時分布が元データにある */
  | "observed"
  /** 曜日別と時間帯別の周辺分布から、独立を仮定して推定した */
  | "estimated";

/**
 * 需要プロファイル。
 *
 * `value` は他のセルとの相対的な高さを表す0〜1の値で、実数の件数ではない。
 * 出典の異なる統計（自殺者数と救急出場件数など）を同じ軸に載せるため、
 * 正規化した相対値だけを扱う。件数としての解釈はできない。
 */
export type DemandCell = {
  weekday: Weekday;
  /** セルの開始時刻（0時からの分数） */
  minutes: number;
  /** 0〜1の相対値。最大のセルが1 */
  value: number;
  basis: DemandBasis;
};

/**
 * 曜日別・時間帯別の周辺分布から需要プロファイルを組み立てる。
 *
 * 返るセルはすべて `basis: "estimated"` になる。同時分布ではないため、
 * 「日曜の23時が最も高い」のような断定には使えない。
 *
 * @param byWeekday 曜日ごとの相対値（7要素、0=日曜）。負の値は不可
 * @param byTimeSlot 時間帯ごとの相対値。長さは1440を割り切れること
 */
export function estimateDemandFromMarginals(
  byWeekday: readonly number[],
  byTimeSlot: readonly number[],
): DemandCell[] {
  if (byWeekday.length !== 7) {
    throw new Error("byWeekday は7要素（日曜〜土曜）で指定してください");
  }
  if (byTimeSlot.length === 0 || MINUTES_PER_DAY % byTimeSlot.length !== 0) {
    throw new Error("byTimeSlot の長さは1440を割り切れる値にしてください");
  }
  if ([...byWeekday, ...byTimeSlot].some((v) => !Number.isFinite(v) || v < 0)) {
    throw new Error("需要値は0以上の有限な数で指定してください");
  }

  const stepMinutes = MINUTES_PER_DAY / byTimeSlot.length;
  const products: DemandCell[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    for (let slot = 0; slot < byTimeSlot.length; slot++) {
      products.push({
        weekday: weekday as Weekday,
        minutes: slot * stepMinutes,
        value: byWeekday[weekday] * byTimeSlot[slot],
        basis: "estimated",
      });
    }
  }

  return normalizeDemand(products);
}

/**
 * 需要値を最大1になるよう正規化する。
 *
 * 最大が0（どのセルにも需要がない）の場合は、0除算を避けてすべて0のまま返す。
 */
export function normalizeDemand(cells: readonly DemandCell[]): DemandCell[] {
  const max = cells.reduce((acc, cell) => Math.max(acc, cell.value), 0);
  if (max <= 0) return cells.map((cell) => ({ ...cell, value: 0 }));
  return cells.map((cell) => ({ ...cell, value: cell.value / max }));
}

export type SupportGapCell = OpenCount & {
  weekday: Weekday;
  minutes: number;
  /** 0〜1の需要の相対値 */
  demand: number;
  demandBasis: DemandBasis;
  /**
   * 空白の大きさ（0〜1）。需要が高く、開いている窓口が少ないほど大きい。
   *
   * 受付時間が判明している施設の中で開いている割合を供給とみなす。
   * 不明な施設を分母に入れると、データが揃っていない地域ほど空白が
   * 大きく見えてしまうため、母数から外す。
   *
   * 判明している施設が1件もない場合は `null`。0を返すと「空白がない」と
   * 読まれるが、実際には「分からない」であるため区別する。
   */
  gapScore: number | null;
};

/**
 * 需要プロファイルと施設一覧から、空白を曜日×時間帯で組み立てる。
 *
 * 需要セルと同じ粒度で返す。施設側はセルの開始時刻を代表点として判定する。
 */
export function buildSupportGap(
  demand: readonly DemandCell[],
  facilities: readonly Facility[],
): SupportGapCell[] {
  return demand.map((cell) => {
    const count = countOpenAt(facilities, cell.weekday, cell.minutes);
    const known = count.open + count.closed;
    const openRatio = known > 0 ? count.open / known : null;

    return {
      ...count,
      weekday: cell.weekday,
      minutes: cell.minutes,
      demand: cell.value,
      demandBasis: cell.basis,
      gapScore: openRatio === null ? null : cell.value * (1 - openRatio),
    };
  });
}

/**
 * 空白が最も大きいセルを返す。判定できないセルは対象外。
 *
 * 同点の場合は曜日・時刻の早い方を返し、呼び出しごとに結果が変わらないようにする。
 */
export function findWidestGap(
  cells: readonly SupportGapCell[],
): SupportGapCell | null {
  let widest: SupportGapCell | null = null;

  for (const cell of cells) {
    if (cell.gapScore === null) continue;
    if (widest === null || cell.gapScore > widest.gapScore!) {
      widest = cell;
    }
  }

  return widest;
}

/**
 * 推定値を含むかどうか。
 *
 * 画面や資料で「推定を含む」と明示する必要があるかの判定に使う。
 */
export function includesEstimatedDemand(
  cells: readonly SupportGapCell[],
): boolean {
  return cells.some((cell) => cell.demandBasis === "estimated");
}
