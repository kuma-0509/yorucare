/**
 * 公的施設・相談窓口の受付時間を、時刻と突き合わせるための純粋ロジック。
 *
 * この層はデータ源に依存しない。自治体標準オープンデータセットの
 * 「公共施設一覧」（利用可能曜日・開始時間・終了時間）でも、他の一覧でも、
 * `Facility` へ正規化できれば同じ判定が使える。
 *
 * 最も重要な制約は、**受付時間が不明な施設を「閉まっている」と数えないこと**。
 * 不明を閉と同一視すると、可視化したい「夜間・休日の空白」を、実際より
 * 大きく見せてしまう。空白の主張はデータで裏付ける前提なので、
 * 不明・開・閉は最後まで別の値として持ち回る。
 */

/** 曜日。0=日曜〜6=土曜。`Date#getDay()` と同じ並びにする */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 1日の分数。日をまたぐ受付時間の判定で使う */
export const MINUTES_PER_DAY = 24 * 60;

/**
 * 受付時間の1区間。
 *
 * `end` が `start` 以下の場合は日をまたぐ区間として扱う
 * （例: 22:00-02:00 は当日22:00から翌日02:00まで）。
 */
export type OpeningPeriod = {
  weekday: Weekday;
  /** 開始時刻 HH:MM（24時間表記） */
  start: string;
  /** 終了時刻 HH:MM（24時間表記）。"24:00" は当日の終端を表す */
  end: string;
};

export type Facility = {
  id: string;
  name: string;
  /**
   * 受付時間。
   *
   * `null` は「データに受付時間が無い」。`[]` は「データはあるが開いている時間が無い」。
   * この2つを同じ値にすると、列が欠けているだけの施設が終日閉業として集計される。
   */
  openingPeriods: OpeningPeriod[] | null;
};

/** ある時点で施設が開いているか。受付時間が不明なら `null` */
export type OpenState = boolean | null;

/**
 * "HH:MM" を0時からの分数へ変換する。解釈できなければ `null`。
 *
 * 終端表記として "24:00" を許容する（1440分）。オープンデータでは
 * 24:00 や 24:30 のような表記で翌日にかかる時間を書くことがあるため、
 * 24時間を超える値も拒否せずそのまま分数として返す。
 */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59) return null;

  const total = hours * 60 + minutes;
  // 翌日にまたがる表記（24:00〜47:59）までを受け付ける
  if (total > 2 * MINUTES_PER_DAY - 1) return null;

  return total;
}

/**
 * 区間が、その曜日の `minutes` 時点を含むか。
 *
 * 日をまたぐ区間は、開始曜日と翌曜日の2つに分けて判定する。
 */
function coversMoment(
  period: OpeningPeriod,
  weekday: Weekday,
  minutes: number,
): boolean {
  const start = parseTimeToMinutes(period.start);
  const end = parseTimeToMinutes(period.end);
  if (start === null || end === null) return false;

  const nextWeekday = ((period.weekday + 1) % 7) as Weekday;
  const crossesMidnight = end <= start;

  if (period.weekday === weekday) {
    const dayEnd = crossesMidnight ? MINUTES_PER_DAY : Math.min(end, MINUTES_PER_DAY);
    if (minutes >= start && minutes < dayEnd) return true;
  }

  // 日をまたぐ分、または 24:00 を超える表記の分を翌曜日で判定する
  const spillover = crossesMidnight ? end : end - MINUTES_PER_DAY;
  if (spillover > 0 && nextWeekday === weekday && minutes < spillover) {
    return true;
  }

  return false;
}

/**
 * 施設がその曜日・時刻に開いているか。
 *
 * 受付時間が不明（`openingPeriods` が `null`）なら `null` を返し、
 * 呼び出し側に「閉」と区別させる。
 */
export function isOpenAt(
  facility: Facility,
  weekday: Weekday,
  minutes: number,
): OpenState {
  if (facility.openingPeriods === null) return null;
  return facility.openingPeriods.some((period) =>
    coversMoment(period, weekday, minutes),
  );
}

/**
 * ある時点の施設数の内訳。
 *
 * `open` だけを見ると母数が分からず、「窓口が少ない」のか
 * 「データが少ない」のか判断できないため、必ず内訳ごと返す。
 */
export type OpenCount = {
  /** 開いていると判定できた施設数 */
  open: number;
  /** 閉まっていると判定できた施設数 */
  closed: number;
  /** 受付時間が不明で判定できない施設数 */
  unknown: number;
  /** 対象施設の総数。open + closed + unknown と一致する */
  total: number;
};

export function countOpenAt(
  facilities: readonly Facility[],
  weekday: Weekday,
  minutes: number,
): OpenCount {
  let open = 0;
  let closed = 0;
  let unknown = 0;

  for (const facility of facilities) {
    const state = isOpenAt(facility, weekday, minutes);
    if (state === null) unknown += 1;
    else if (state) open += 1;
    else closed += 1;
  }

  return { open, closed, unknown, total: facilities.length };
}

export type HeatmapCell = OpenCount & {
  weekday: Weekday;
  /** セルの開始時刻（0時からの分数） */
  minutes: number;
};

/**
 * 曜日×時間帯のヒートマップを組み立てる。
 *
 * 各セルはその区間の**開始時刻**で判定する。区間内で開閉が変わる場合を
 * 平均や割合に均すと、「21時台は半分開いている」のような、どの瞬間にも
 * 対応しない値になるため、代表点を1つ選ぶ方式にしている。
 *
 * @param stepMinutes セルの幅（分）。1440 を割り切れる値であること
 */
export function buildWeeklyHeatmap(
  facilities: readonly Facility[],
  stepMinutes = 60,
): HeatmapCell[] {
  if (!Number.isInteger(stepMinutes) || stepMinutes <= 0) {
    throw new Error("stepMinutes は正の整数で指定してください");
  }
  if (MINUTES_PER_DAY % stepMinutes !== 0) {
    throw new Error("stepMinutes は1440を割り切れる値で指定してください");
  }

  const cells: HeatmapCell[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += stepMinutes) {
      cells.push({
        weekday: weekday as Weekday,
        minutes,
        ...countOpenAt(facilities, weekday as Weekday, minutes),
      });
    }
  }
  return cells;
}

/**
 * 判定に使う曜日を決める。
 *
 * 祝日は多くの施設が日曜と同じ扱いになるため、祝日フラグが立っていれば
 * 日曜として判定する。これは近似であり、祝日も開所する施設は実際より
 * 閉じて見える。祝日判定そのものは暦データを要するため、この層では持たず
 * 呼び出し側から受け取る。
 */
export function resolveWeekday(date: Date, isHoliday = false): Weekday {
  if (isHoliday) return 0;
  return date.getDay() as Weekday;
}

/** `Date` の時刻を0時からの分数にする */
export function toMinutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}
