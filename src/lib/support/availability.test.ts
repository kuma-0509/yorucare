import { describe, expect, it } from "vitest";
import { getSupportAvailability } from "./availability";
import type { SupportResource } from "./types";

const demoSource = {
  provider: "テスト",
  datasetName: "テスト用",
  updatedAt: null,
  kind: "demo",
  permissionBasis: "demoOnly",
} as const;

function makeResource(overrides: Partial<SupportResource> = {}): SupportResource {
  return {
    id: "r1",
    name: "テスト窓口",
    category: "mentalHealth",
    description: "テスト",
    prefecture: "東京都",
    consultationMethod: ["phone"],
    availableDays: [1, 2, 3, 4, 5],
    openingTime: "09:00",
    closingTime: "17:00",
    source: demoSource,
    ...overrides,
  };
}

/** 2026-08-05 は水曜、2026-08-08 は土曜、2026-08-09 は日曜 */
function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 7, day, hour, minute);
}

describe("受付状況", () => {
  it("24時間対応は常に受付中として返す", () => {
    const result = getSupportAvailability(
      makeResource({
        is24Hours: true,
        availableDays: undefined,
        openingTime: undefined,
        closingTime: undefined,
      }),
      at(9, 3)
    );
    expect(result.status).toBe("open24Hours");
    expect(result.isOpenNow).toBe(true);
    expect(result.nextOpening).toBeNull();
  });

  it("受付曜日の受付時間内は受付中になる", () => {
    const result = getSupportAvailability(makeResource(), at(5, 10));
    expect(result.status).toBe("open");
    expect(result.isOpenNow).toBe(true);
    expect(result.closingTime).toBe("17:00");
  });

  it("受付曜日でも終了後は本日受付終了になり、次回受付日時を返す", () => {
    const result = getSupportAvailability(makeResource(), at(5, 18));
    expect(result.status).toBe("closedToday");
    expect(result.isOpenNow).toBe(false);
    // 木曜の09:00
    expect(result.nextOpening).toEqual({
      date: "2026-08-06",
      weekday: 4,
      openingTime: "09:00",
      daysAhead: 1,
    });
  });

  it("受付開始前は、本日この後の受付を次回として返す", () => {
    const result = getSupportAvailability(makeResource(), at(5, 7));
    expect(result.status).toBe("beforeOpening");
    expect(result.nextOpening?.daysAhead).toBe(0);
    expect(result.nextOpening?.date).toBe("2026-08-05");
  });

  it("受付日ではない日は、次の受付日を返す", () => {
    // 土曜。次は月曜
    const result = getSupportAvailability(makeResource(), at(8, 12));
    expect(result.status).toBe("closedByDay");
    expect(result.nextOpening).toEqual({
      date: "2026-08-10",
      weekday: 1,
      openingTime: "09:00",
      daysAhead: 2,
    });
  });

  it("日をまたぐ受付は、翌日の早朝も受付中として扱う", () => {
    const overnight = makeResource({
      availableDays: [5, 6],
      openingTime: "22:00",
      closingTime: "04:00",
    });
    // 金曜23:00
    expect(getSupportAvailability(overnight, at(7, 23)).status).toBe("open");
    // 土曜02:00（金曜の受付が続いている）
    expect(getSupportAvailability(overnight, at(8, 2)).status).toBe("open");
    // 日曜02:00（土曜の受付が続いている）
    expect(getSupportAvailability(overnight, at(9, 2)).status).toBe("open");
    // 日曜12:00（受付日ではない）
    expect(getSupportAvailability(overnight, at(9, 12)).status).toBe("closedByDay");
  });

  it("受付条件がないデータは「不明」にし、受付中とは扱わない", () => {
    const result = getSupportAvailability(
      makeResource({
        availableDays: undefined,
        openingTime: undefined,
        closingTime: undefined,
      }),
      at(5, 10)
    );
    expect(result.status).toBe("unknown");
    expect(result.isOpenNow).toBe(false);
    expect(result.nextOpening).toBeNull();
  });
});
