import { describe, expect, it } from "vitest";
import {
  buildWeeklyHeatmap,
  countOpenAt,
  isOpenAt,
  MINUTES_PER_DAY,
  parseTimeToMinutes,
  resolveWeekday,
  toMinutesOfDay,
  type Facility,
  type Weekday,
} from "./opening-hours";

const MONDAY: Weekday = 1;
const SATURDAY: Weekday = 6;
const SUNDAY: Weekday = 0;

function at(hours: number, minutes = 0): number {
  return hours * 60 + minutes;
}

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

describe("parseTimeToMinutes", () => {
  it("HH:MM を分数へ変換する", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("1桁の時と前後の空白を許容する", () => {
    expect(parseTimeToMinutes("9:05")).toBe(545);
    expect(parseTimeToMinutes("  09:05  ")).toBe(545);
  });

  it("終端表記の24:00を1440分として扱う", () => {
    expect(parseTimeToMinutes("24:00")).toBe(MINUTES_PER_DAY);
  });

  it("翌日にまたがる表記を受け付ける", () => {
    expect(parseTimeToMinutes("25:30")).toBe(25 * 60 + 30);
  });

  it("解釈できない表記は null を返す", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("9時")).toBeNull();
    expect(parseTimeToMinutes("09:60")).toBeNull();
    expect(parseTimeToMinutes("48:00")).toBeNull();
  });
});

describe("isOpenAt", () => {
  const office = weekdayOffice("a");

  it("受付時間内なら開いている", () => {
    expect(isOpenAt(office, MONDAY, at(10))).toBe(true);
  });

  it("開始時刻ちょうどは開いている", () => {
    expect(isOpenAt(office, MONDAY, at(9))).toBe(true);
  });

  it("終了時刻ちょうどは閉まっている", () => {
    expect(isOpenAt(office, MONDAY, at(17))).toBe(false);
  });

  it("受付のない曜日は閉まっている", () => {
    expect(isOpenAt(office, SUNDAY, at(10))).toBe(false);
  });

  it("夜間は閉まっている", () => {
    expect(isOpenAt(office, MONDAY, at(22))).toBe(false);
  });

  it("受付時間が不明なら null を返し、閉と区別する", () => {
    const unknown: Facility = {
      id: "u",
      name: "受付時間の記載がない施設",
      openingPeriods: null,
    };
    expect(isOpenAt(unknown, MONDAY, at(10))).toBeNull();
  });

  it("受付時間が空配列なら閉まっていると判定する", () => {
    const closed: Facility = { id: "c", name: "休止中", openingPeriods: [] };
    expect(isOpenAt(closed, MONDAY, at(10))).toBe(false);
  });
});

describe("isOpenAt（日をまたぐ受付時間）", () => {
  const nightLine: Facility = {
    id: "n",
    name: "土曜夜間相談",
    openingPeriods: [{ weekday: SATURDAY, start: "22:00", end: "02:00" }],
  };

  it("開始日の深夜帯は開いている", () => {
    expect(isOpenAt(nightLine, SATURDAY, at(23))).toBe(true);
  });

  it("翌日へまたいだ時間帯も開いている", () => {
    expect(isOpenAt(nightLine, SUNDAY, at(1))).toBe(true);
  });

  it("翌日の終了時刻を過ぎたら閉まっている", () => {
    expect(isOpenAt(nightLine, SUNDAY, at(2))).toBe(false);
    expect(isOpenAt(nightLine, SUNDAY, at(3))).toBe(false);
  });

  it("開始日の開始時刻より前は閉まっている", () => {
    expect(isOpenAt(nightLine, SATURDAY, at(21, 59))).toBe(false);
  });

  it("24時を超える表記でも翌日へまたぐ", () => {
    const late: Facility = {
      id: "l",
      name: "25時まで",
      openingPeriods: [{ weekday: SATURDAY, start: "20:00", end: "25:00" }],
    };
    expect(isOpenAt(late, SATURDAY, at(23))).toBe(true);
    expect(isOpenAt(late, SUNDAY, at(0, 30))).toBe(true);
    expect(isOpenAt(late, SUNDAY, at(1))).toBe(false);
  });

  it("終了時刻が解釈できない区間は開いていると判定しない", () => {
    const broken: Facility = {
      id: "b",
      name: "表記崩れ",
      openingPeriods: [{ weekday: MONDAY, start: "09:00", end: "なし" }],
    };
    expect(isOpenAt(broken, MONDAY, at(10))).toBe(false);
  });
});

describe("countOpenAt", () => {
  const facilities: Facility[] = [
    weekdayOffice("a"),
    weekdayOffice("b"),
    { id: "u", name: "時間不明", openingPeriods: null },
    {
      id: "n",
      name: "土曜夜間相談",
      openingPeriods: [{ weekday: SATURDAY, start: "22:00", end: "02:00" }],
    },
  ];

  it("開・閉・不明を別々に数え、母数を返す", () => {
    const count = countOpenAt(facilities, MONDAY, at(10));
    expect(count).toEqual({ open: 2, closed: 1, unknown: 1, total: 4 });
  });

  it("内訳の合計が総数と一致する", () => {
    const count = countOpenAt(facilities, SATURDAY, at(23));
    expect(count.open + count.closed + count.unknown).toBe(count.total);
  });

  it("土曜夜間はほとんどの窓口が閉まっている", () => {
    const count = countOpenAt(facilities, SATURDAY, at(23));
    expect(count.open).toBe(1);
    expect(count.closed).toBe(2);
  });

  it("不明な施設を閉として数えない", () => {
    const count = countOpenAt(facilities, SUNDAY, at(10));
    expect(count.closed).toBe(3);
    expect(count.unknown).toBe(1);
  });

  it("施設が0件でも母数0で返す", () => {
    expect(countOpenAt([], MONDAY, at(10))).toEqual({
      open: 0,
      closed: 0,
      unknown: 0,
      total: 0,
    });
  });
});

describe("buildWeeklyHeatmap", () => {
  const facilities = [weekdayOffice("a")];

  it("1時間刻みで7日分のセルを返す", () => {
    const cells = buildWeeklyHeatmap(facilities);
    expect(cells).toHaveLength(7 * 24);
  });

  it("刻み幅を変えられる", () => {
    expect(buildWeeklyHeatmap(facilities, 30)).toHaveLength(7 * 48);
  });

  it("平日日中のセルだけが開いている", () => {
    const cells = buildWeeklyHeatmap(facilities);
    const openCells = cells.filter((cell) => cell.open > 0);
    expect(openCells).toHaveLength(5 * 8);
    expect(openCells.every((cell) => cell.weekday >= 1 && cell.weekday <= 5)).toBe(
      true,
    );
    expect(
      openCells.every((cell) => cell.minutes >= at(9) && cell.minutes < at(17)),
    ).toBe(true);
  });

  it("夜間と土日のセルは開いている施設が0件になる", () => {
    const cells = buildWeeklyHeatmap(facilities);
    const nightAndWeekend = cells.filter(
      (cell) =>
        cell.weekday === SATURDAY ||
        cell.weekday === SUNDAY ||
        cell.minutes >= at(18) ||
        cell.minutes < at(8),
    );
    expect(nightAndWeekend.every((cell) => cell.open === 0)).toBe(true);
  });

  it("1440を割り切れない刻み幅は拒否する", () => {
    expect(() => buildWeeklyHeatmap(facilities, 7)).toThrow();
    expect(() => buildWeeklyHeatmap(facilities, 0)).toThrow();
  });
});

describe("resolveWeekday", () => {
  it("通常日は Date の曜日を返す", () => {
    // 2026-08-04 は火曜日
    expect(resolveWeekday(new Date(2026, 7, 4))).toBe(2);
  });

  it("祝日は日曜として扱う", () => {
    expect(resolveWeekday(new Date(2026, 7, 4), true)).toBe(SUNDAY);
  });
});

describe("toMinutesOfDay", () => {
  it("時刻を0時からの分数にする", () => {
    expect(toMinutesOfDay(new Date(2026, 7, 4, 21, 30))).toBe(at(21, 30));
    expect(toMinutesOfDay(new Date(2026, 7, 4, 0, 0))).toBe(0);
  });
});
