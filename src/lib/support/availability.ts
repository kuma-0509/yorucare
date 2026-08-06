import type { SupportResource } from "./types";

/**
 * 受付状況の判定。
 *
 * ここで扱うのは公開データに書かれた受付曜日・時刻だけで、本人の記録は見ない。
 * 「受付中かどうか」はデータと時計から決まる事実であり、
 * 本人の状態を推定した結果ではない。
 *
 * 受付条件は変更されることがある。画面では必ず、
 * 利用前に公式サイトか電話で確認するよう案内する。
 */

export type SupportAvailabilityStatus =
  /** 24時間対応 */
  | "open24Hours"
  /** いま受付中 */
  | "open"
  /** 本日は受付日で、受付開始前 */
  | "beforeOpening"
  /** 本日は受付日だが、受付時間が終わっている */
  | "closedToday"
  /** 本日は受付日ではない */
  | "closedByDay"
  /** 受付条件がデータにない */
  | "unknown";

export type NextOpening = {
  /** YYYY-MM-DD */
  date: string;
  /** 0=日曜 〜 6=土曜 */
  weekday: number;
  /** HH:MM */
  openingTime: string;
  /** 今日から何日後か。0 なら本日中 */
  daysAhead: number;
};

export type SupportAvailability = {
  status: SupportAvailabilityStatus;
  isOpenNow: boolean;
  /** 受付中のときの終了時刻。24時間対応・受付外・不明では null */
  closingTime: string | null;
  /** 次回の受付開始。受付中・24時間対応・不明では null */
  nextOpening: NextOpening | null;
};

/** 次回受付日時を探す上限。これを超えて見つからなければ null を返す */
const NEXT_OPENING_SEARCH_DAYS = 14;

function parseTime(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function findNextOpening(
  now: Date,
  availableDays: number[],
  openingMinutes: number
): NextOpening | null {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let offset = 0; offset <= NEXT_OPENING_SEARCH_DAYS; offset += 1) {
    const day = addDays(now, offset);
    const weekday = day.getDay();
    if (!availableDays.includes(weekday)) continue;
    // 本日分は、開始時刻をまだ過ぎていない場合だけ次回になる
    if (offset === 0 && nowMinutes >= openingMinutes) continue;
    return {
      date: toDateString(day),
      weekday,
      openingTime: `${String(Math.floor(openingMinutes / 60)).padStart(2, "0")}:${String(
        openingMinutes % 60
      ).padStart(2, "0")}`,
      daysAhead: offset,
    };
  }
  return null;
}

/**
 * 現在時刻と曜日から、その支援先の受付状況を求める。
 *
 * `closingTime` が `openingTime` 以下のときは日をまたぐ受付として扱う
 * （例: 22:00〜04:00）。前日の受付が続いているかも見る。
 */
export function getSupportAvailability(
  resource: SupportResource,
  now: Date
): SupportAvailability {
  if (resource.is24Hours) {
    return {
      status: "open24Hours",
      isOpenNow: true,
      closingTime: null,
      nextOpening: null,
    };
  }

  const openingMinutes = parseTime(resource.openingTime);
  const closingMinutes = parseTime(resource.closingTime);
  const availableDays = resource.availableDays;

  if (
    openingMinutes === null ||
    closingMinutes === null ||
    !availableDays ||
    availableDays.length === 0
  ) {
    return {
      status: "unknown",
      isOpenNow: false,
      closingTime: null,
      nextOpening: null,
    };
  }

  const weekday = now.getDay();
  const previousWeekday = (weekday + 6) % 7;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const crossesMidnight = closingMinutes <= openingMinutes;

  const openToday =
    availableDays.includes(weekday) &&
    nowMinutes >= openingMinutes &&
    (crossesMidnight ? true : nowMinutes < closingMinutes);
  const openFromYesterday =
    crossesMidnight &&
    availableDays.includes(previousWeekday) &&
    nowMinutes < closingMinutes;

  if (openToday || openFromYesterday) {
    return {
      status: "open",
      isOpenNow: true,
      closingTime: resource.closingTime ?? null,
      nextOpening: null,
    };
  }

  const availableToday = availableDays.includes(weekday);
  const status: SupportAvailabilityStatus = !availableToday
    ? "closedByDay"
    : nowMinutes < openingMinutes
      ? "beforeOpening"
      : "closedToday";

  return {
    status,
    isOpenNow: false,
    closingTime: null,
    nextOpening: findNextOpening(now, availableDays, openingMinutes),
  };
}
