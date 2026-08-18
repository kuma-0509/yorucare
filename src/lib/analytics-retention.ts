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
  /**
   * 週あたり記録日数の中央値（小数第1位まで）。
   * 対象は Day 0〜Day 27 を4つの週に区切った各週で、記録が0日の週も含める。
   * 0日の週を除くと「使わなかった週」が見えなくなり、実態より多く見えるため。
   * 対象が0件のときは 0 ではなく null を返す。
   */
  medianWeeklyRecordDays: number | null;
  /** 中央値の母数。端末・ブラウザ × 週の数 */
  weeklyRecordDaySamples: number;
  /**
   * 観測窓の中に、記録がない日が7日以上続いた期間があった端末・ブラウザ数。
   * 観測窓の最後まで記録が戻らなかった場合も、中断があったものとして数える。
   * 再開した側だけを分母にすると、再開率は必ず100%になる。
   */
  interruptedInstalls: number;
  /** 中断のあと、観測窓の中で再び記録があった端末・ブラウザ数 */
  resumedInstalls: number;
  /** 中断があった端末・ブラウザのうち再開した割合。中断が0件なら null */
  resumptionRate: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 観測窓の日数。Day 0 から Day 27 までの4週間。
 * Week 2・Week 4 継続率と同じ窓を使い、集計日によって値が動かないようにする。
 */
const OBSERVATION_DAYS = 28;
const WEEK_DAYS = 7;

/**
 * 中断とみなす、記録がない日の連続日数。
 * `docs/phase2-plan.md` 3.2節の「7日以上記録がない期間」に合わせる。
 */
const INTERRUPTION_DAYS = 7;

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

/** 中央値（小数第1位まで）。対象が0件なら null */
function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
}

/** 観測窓を7日ずつ4つに区切り、それぞれの記録日数を返す。記録が0日の週も含める */
function countRecordDaysByWeek(offsets: readonly number[]): number[] {
  const counts: number[] = [];
  for (let start = 0; start < OBSERVATION_DAYS; start += WEEK_DAYS) {
    counts.push(
      offsets.filter((offset) => offset >= start && offset < start + WEEK_DAYS)
        .length
    );
  }
  return counts;
}

type Interruption = {
  /** 記録がない日が7日以上続いた期間があったか */
  interrupted: boolean;
  /** その期間のあとに、観測窓の中で再び記録があったか */
  resumed: boolean;
};

/**
 * 観測窓の中の中断と再開を判定する。
 *
 * 記録の間隔が空いた場合と、観測窓の終わりまで記録が戻らなかった場合を
 * どちらも中断として数える。後者を数えないと、分母が「再開した端末」だけになり、
 * 再開率が必ず100%になって、中断を失敗にしない設計が働いたかを判断できない。
 */
function detectInterruption(offsets: readonly number[]): Interruption {
  let resumed = false;
  for (let index = 1; index < offsets.length; index += 1) {
    const unrecordedDays = offsets[index] - offsets[index - 1] - 1;
    if (unrecordedDays >= INTERRUPTION_DAYS) resumed = true;
  }

  const lastOffset = offsets[offsets.length - 1] ?? -1;
  const trailingUnrecordedDays = OBSERVATION_DAYS - 1 - lastOffset;

  return {
    interrupted: resumed || trailingUnrecordedDays >= INTERRUPTION_DAYS,
    resumed,
  };
}

export function toJapanDate(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * 日次集計から `docs/phase2-plan.md` 3.2節の主要指標5件を再計算する。
 *
 * 集計単位は人ではなく、匿名の端末・ブラウザ。`record_saved` の最初の
 * サーバ受信日を Day 0 とし、Day 0 から27日以上経過したものだけを分母にする。
 * 指標はすべて Day 0〜Day 27 の同じ窓で数えるので、集計日を後ろへずらしても
 * 同じ端末・ブラウザの値は変わらない。
 *
 * この層は数値を出すだけで、合否は判断しない。Gate 1 の判定条件（15以上）は
 * `docs/phase2-plan.md` 4節にあり、読み出し側が併記する。
 */
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
  let interruptedInstalls = 0;
  let resumedInstalls = 0;
  const weeklyRecordDays: number[] = [];

  for (const days of daysByInstall.values()) {
    const sortedDays = [...days].sort();
    const day0 = sortedDays[0];
    if (!day0 || dayOffset(day0, asOfDate) < OBSERVATION_DAYS - 1) continue;

    matureInstalls += 1;
    const offsets = sortedDays
      .map((date) => dayOffset(day0, date))
      .filter((offset) => offset >= 0 && offset < OBSERVATION_DAYS);

    if (offsets.filter((offset) => offset >= 0 && offset <= 6).length >= 2) {
      firstWeekMultiDayInstalls += 1;
    }
    if (offsets.some((offset) => offset >= 7 && offset <= 13)) {
      week2RetainedInstalls += 1;
    }
    if (offsets.some((offset) => offset >= 21 && offset <= 27)) {
      week4RetainedInstalls += 1;
    }

    weeklyRecordDays.push(...countRecordDaysByWeek(offsets));

    const interruption = detectInterruption(offsets);
    if (interruption.interrupted) interruptedInstalls += 1;
    if (interruption.resumed) resumedInstalls += 1;
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
    medianWeeklyRecordDays: median(weeklyRecordDays),
    weeklyRecordDaySamples: weeklyRecordDays.length,
    interruptedInstalls,
    resumedInstalls,
    resumptionRate: rate(resumedInstalls, interruptedInstalls),
  };
}
