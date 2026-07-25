export type RecordActivityDay = {
  installIdHash: string;
  activityDate: string;
};

export type RetentionSummary = {
  asOfDate: string;
  matureInstalls: number;
  firstWeekMultiDayInstalls: number;
  week2RetainedInstalls: number;
  week4RetainedInstalls: number;
  firstWeekMultiDayRate: number | null;
  week2RetentionRate: number | null;
  week4RetentionRate: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

function dayOffset(day0: string, date: string): number {
  return Math.round((parseDate(date) - parseDate(day0)) / DAY_MS);
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function toJapanDate(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function calculateRetentionSummary(
  rows: readonly RecordActivityDay[],
  asOfDate: string
): RetentionSummary {
  const daysByInstall = new Map<string, Set<string>>();

  for (const row of rows) {
    const days = daysByInstall.get(row.installIdHash) ?? new Set<string>();
    days.add(row.activityDate);
    daysByInstall.set(row.installIdHash, days);
  }

  let matureInstalls = 0;
  let firstWeekMultiDayInstalls = 0;
  let week2RetainedInstalls = 0;
  let week4RetainedInstalls = 0;

  for (const days of daysByInstall.values()) {
    const sortedDays = [...days].sort();
    const day0 = sortedDays[0];
    if (!day0 || dayOffset(day0, asOfDate) < 27) continue;

    matureInstalls += 1;
    const offsets = sortedDays.map((date) => dayOffset(day0, date));

    if (offsets.filter((offset) => offset >= 0 && offset <= 6).length >= 2) {
      firstWeekMultiDayInstalls += 1;
    }
    if (offsets.some((offset) => offset >= 7 && offset <= 13)) {
      week2RetainedInstalls += 1;
    }
    if (offsets.some((offset) => offset >= 21 && offset <= 27)) {
      week4RetainedInstalls += 1;
    }
  }

  return {
    asOfDate,
    matureInstalls,
    firstWeekMultiDayInstalls,
    week2RetainedInstalls,
    week4RetainedInstalls,
    firstWeekMultiDayRate: rate(firstWeekMultiDayInstalls, matureInstalls),
    week2RetentionRate: rate(week2RetainedInstalls, matureInstalls),
    week4RetentionRate: rate(week4RetainedInstalls, matureInstalls),
  };
}
