import { describe, expect, it } from "vitest";
import type { Facility, Weekday } from "./opening-hours";
import {
  buildSupportGap,
  estimateDemandFromMarginals,
  findWidestGap,
  includesEstimatedDemand,
  normalizeDemand,
  type DemandCell,
} from "./support-gap";

const SUNDAY: Weekday = 0;
const MONDAY: Weekday = 1;

/** 平日9-17時だけ開く窓口 */
function weekdayOffice(id: string): Facility {
  return {
    id,
    name: `平日窓口${id}`,
    openingPeriods: [1, 2, 3, 4, 5].map((weekday) => ({
      weekday: weekday as Weekday,
      start: "09:00",
      end: "17:00",
    })),
  };
}

function cell(
  weekday: Weekday,
  minutes: number,
  value: number,
  basis: DemandCell["basis"] = "observed",
): DemandCell {
  return { weekday, minutes, value, basis };
}

describe("normalizeDemand", () => {
  it("最大値が1になるよう揃える", () => {
    const result = normalizeDemand([
      cell(SUNDAY, 0, 2),
      cell(SUNDAY, 60, 4),
      cell(SUNDAY, 120, 0),
    ]);
    expect(result.map((c) => c.value)).toEqual([0.5, 1, 0]);
  });

  it("すべて0なら0のまま返す（0除算しない）", () => {
    const result = normalizeDemand([cell(SUNDAY, 0, 0), cell(SUNDAY, 60, 0)]);
    expect(result.every((c) => c.value === 0)).toBe(true);
  });

  it("basis を保つ", () => {
    const result = normalizeDemand([cell(SUNDAY, 0, 3, "estimated")]);
    expect(result[0].basis).toBe("estimated");
  });
});

describe("estimateDemandFromMarginals", () => {
  const SRC = "東京消防庁 救急活動の現況";
  const byWeekday = { source: SRC, values: [1, 2, 1, 1, 1, 1, 1] };
  const byTimeSlot = {
    source: SRC,
    values: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  };

  it("曜日×時間帯のセルをすべて返す", () => {
    const cells = estimateDemandFromMarginals(byWeekday, byTimeSlot);
    expect(cells).toHaveLength(7 * 12);
  });

  it("2時間刻みの時間帯を分数へ展開する", () => {
    const cells = estimateDemandFromMarginals(byWeekday, byTimeSlot);
    const sunday = cells.filter((c) => c.weekday === SUNDAY);
    expect(sunday.map((c) => c.minutes)).toEqual([
      0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320,
    ]);
  });

  it("推定であることを必ず示す", () => {
    const cells = estimateDemandFromMarginals(byWeekday, byTimeSlot);
    expect(cells.every((c) => c.basis === "estimated")).toBe(true);
  });

  it("周辺分布の積を正規化して返す", () => {
    const cells = estimateDemandFromMarginals(
      { source: SRC, values: [1, 2, 0, 0, 0, 0, 0] },
      { source: SRC, values: [1, 3] },
    );
    const monday = cells.filter((c) => c.weekday === MONDAY);
    // 月曜(2) × 後半(3) = 6 が最大
    expect(Math.max(...cells.map((c) => c.value))).toBe(1);
    expect(monday[1].value).toBe(1);
    expect(monday[0].value).toBeCloseTo(2 / 6);
  });

  it("出典の異なる周辺分布は掛け合わせない", () => {
    // 曜日は自殺対策白書、時間帯は東京消防庁。積に対応する実体が存在しない
    expect(() =>
      estimateDemandFromMarginals(
        { source: "自殺対策白書 第1-36図", values: [1, 2, 1, 1, 1, 1, 1] },
        byTimeSlot,
      ),
    ).toThrow(/出典/);
  });

  it("曜日が7要素でなければ拒否する", () => {
    expect(() =>
      estimateDemandFromMarginals({ source: SRC, values: [1, 1] }, byTimeSlot),
    ).toThrow();
  });

  it("1440を割り切れない時間帯数を拒否する", () => {
    // 7区切りは1440を割り切れない（5区切りは割り切れるため反例にならない）
    expect(() =>
      estimateDemandFromMarginals(byWeekday, {
        source: SRC,
        values: [1, 1, 1, 1, 1, 1, 1],
      }),
    ).toThrow();
    expect(() =>
      estimateDemandFromMarginals(byWeekday, { source: SRC, values: [] }),
    ).toThrow();
  });

  it("負の需要値を拒否する", () => {
    expect(() =>
      estimateDemandFromMarginals(
        { source: SRC, values: [1, -1, 1, 1, 1, 1, 1] },
        byTimeSlot,
      ),
    ).toThrow();
  });
});

describe("buildSupportGap", () => {
  const facilities = [weekdayOffice("a"), weekdayOffice("b")];

  it("需要セルと同じ粒度で返す", () => {
    const demand = [cell(MONDAY, 600, 1), cell(SUNDAY, 1380, 1)];
    expect(buildSupportGap(demand, facilities)).toHaveLength(2);
  });

  it("窓口が全て開いていれば空白は0になる", () => {
    const gap = buildSupportGap([cell(MONDAY, 600, 1)], facilities);
    expect(gap[0].open).toBe(2);
    expect(gap[0].gapScore).toBe(0);
  });

  it("需要が高く窓口が閉まっていれば空白は最大になる", () => {
    const gap = buildSupportGap([cell(SUNDAY, 1380, 1)], facilities);
    expect(gap[0].open).toBe(0);
    expect(gap[0].gapScore).toBe(1);
  });

  it("需要が0なら窓口が閉まっていても空白は0", () => {
    const gap = buildSupportGap([cell(SUNDAY, 1380, 0)], facilities);
    expect(gap[0].gapScore).toBe(0);
  });

  it("開いている割合に応じて空白が縮む", () => {
    const mixed = [
      weekdayOffice("a"),
      {
        id: "n",
        name: "日曜夜間",
        openingPeriods: [{ weekday: SUNDAY, start: "21:00", end: "24:00" }],
      },
    ];
    const gap = buildSupportGap([cell(SUNDAY, 1380, 1)], mixed);
    expect(gap[0].open).toBe(1);
    expect(gap[0].closed).toBe(1);
    expect(gap[0].gapScore).toBe(0.5);
  });

  it("受付時間が不明な施設を分母に入れない", () => {
    const withUnknown = [
      ...facilities,
      { id: "u", name: "時間不明", openingPeriods: null },
    ];
    const gap = buildSupportGap([cell(SUNDAY, 1380, 1)], withUnknown);
    expect(gap[0].unknown).toBe(1);
    expect(gap[0].total).toBe(3);
    // 判明している2件がいずれも閉なので、不明1件があっても空白は1のまま
    expect(gap[0].gapScore).toBe(1);
  });

  it("判明している施設が0件なら null を返し、空白なしと区別する", () => {
    const allUnknown = [{ id: "u", name: "時間不明", openingPeriods: null }];
    const gap = buildSupportGap([cell(SUNDAY, 1380, 1)], allUnknown);
    expect(gap[0].gapScore).toBeNull();
    expect(gap[0].unknown).toBe(1);
  });

  it("需要の由来を引き継ぐ", () => {
    const gap = buildSupportGap(
      [cell(SUNDAY, 1380, 1, "estimated")],
      facilities,
    );
    expect(gap[0].demandBasis).toBe("estimated");
  });

  it("施設が0件でも母数0で返す", () => {
    const gap = buildSupportGap([cell(MONDAY, 600, 1)], []);
    expect(gap[0].total).toBe(0);
    expect(gap[0].gapScore).toBeNull();
  });
});

describe("findWidestGap", () => {
  const facilities = [weekdayOffice("a")];

  it("空白が最大のセルを返す", () => {
    const demand = [
      cell(MONDAY, 600, 1),
      cell(SUNDAY, 1380, 0.8),
      cell(SUNDAY, 60, 0.4),
    ];
    const widest = findWidestGap(buildSupportGap(demand, facilities));
    expect(widest?.weekday).toBe(SUNDAY);
    expect(widest?.minutes).toBe(1380);
  });

  it("判定できないセルを選ばない", () => {
    const gap = buildSupportGap(
      [cell(SUNDAY, 1380, 1)],
      [{ id: "u", name: "時間不明", openingPeriods: null }],
    );
    expect(findWidestGap(gap)).toBeNull();
  });

  it("同点なら先に現れたセルを返す", () => {
    const demand = [cell(SUNDAY, 60, 1), cell(SUNDAY, 120, 1)];
    const widest = findWidestGap(buildSupportGap(demand, facilities));
    expect(widest?.minutes).toBe(60);
  });

  it("セルが0件なら null", () => {
    expect(findWidestGap([])).toBeNull();
  });
});

describe("includesEstimatedDemand", () => {
  const facilities = [weekdayOffice("a")];

  it("推定セルが混ざっていれば true", () => {
    const gap = buildSupportGap(
      [cell(MONDAY, 600, 1), cell(SUNDAY, 1380, 1, "estimated")],
      facilities,
    );
    expect(includesEstimatedDemand(gap)).toBe(true);
  });

  it("すべて実測なら false", () => {
    const gap = buildSupportGap([cell(MONDAY, 600, 1)], facilities);
    expect(includesEstimatedDemand(gap)).toBe(false);
  });
});

describe("支援の空白の再現（平日日中しか開かない窓口）", () => {
  it("日曜夜が最も空白の大きい時間帯になる", () => {
    // 月曜に負荷が寄り、深夜帯が高い、という周辺分布を仮に置く
    const source = "同一出典の仮データ";
    const byWeekday = { source, values: [1.2, 1.4, 1, 1, 1, 1, 1.1] };
    // 3時間刻み。0-3時と21-24時を高くする
    const byTimeSlot = {
      source,
      values: [1.3, 0.6, 0.5, 0.8, 0.9, 0.9, 1.0, 1.4],
    };
    const demand = estimateDemandFromMarginals(byWeekday, byTimeSlot);
    const gap = buildSupportGap(demand, [weekdayOffice("a")]);

    const widest = findWidestGap(gap);
    expect(widest).not.toBeNull();
    expect(widest!.open).toBe(0);
    // 推定値であることが最後まで残る
    expect(widest!.demandBasis).toBe("estimated");
    expect(includesEstimatedDemand(gap)).toBe(true);
  });

  it("平日日中のセルは空白が0になる", () => {
    const source = "同一出典の仮データ";
    const demand = estimateDemandFromMarginals(
      { source, values: [1, 1, 1, 1, 1, 1, 1] },
      { source, values: [1, 1, 1, 1, 1, 1, 1, 1] },
    );
    const gap = buildSupportGap(demand, [weekdayOffice("a")]);
    const mondayNoon = gap.find(
      (c) => c.weekday === MONDAY && c.minutes === 12 * 60,
    );
    expect(mondayNoon?.gapScore).toBe(0);
  });
});
