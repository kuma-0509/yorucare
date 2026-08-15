import { countDaysInRange, indexRecordsByDate, MAX_RANGE_DAYS } from "./range";
import { findStreaks } from "./streaks";
import type { DailyRecord } from "../types";

/**
 * 積み重ねの可視化を、定型ルールだけで組み立てる。
 *
 * ここではLLMを呼ばず、外部通信もしない。節目のねぎらいは毎回同じ言葉になるほうがよく、
 * 言い方が日によってぶれると本人にとって不安になる。
 *
 * 文面と並べ方には次の制約を置く。守るのは表示側ではなくこの層の仕事とする。
 *
 * 1. 連続記録を主役にしない。`docs/phase2-plan.md` 2節の「未入力や中断を失敗として扱わず、
 *    連続記録だけを評価・強調しない」に従う。上に置くのは中断で減らない累計
 *    （記録した日・できたことがあった日）で、連続は最長を1行だけ添える。
 * 2. 「いま何日続いているか」は出さない。1日空けた翌日に数字が1へ戻る表示は、
 *    書けなかった日を目に見える損失として示すことになる。
 * 3. 節目は累計と、起点からの経過日数だけに置く。連続日数を節目にしない。
 *    どちらも中断で減らないため、書けない期間があっても節目が失われない。
 * 4. 評価語（よい、悪い、順調、改善）、助言（〜しましょう）、
 *    診断・治療に読める語を出さない。判断は本人と支援者・医師が行う。
 */

/** 起点の由来。表示の呼び方を変えるために持つ */
export type StartPointSource =
  /** 本人が設定した復職日 */
  | "returnDate"
  /** 復職日が未設定のときの既定。最初に記録した日 */
  | "firstRecord";

export type StartPoint = {
  /** YYYY-MM-DD（この日を含む） */
  date: string;
  source: StartPointSource;
};

export type MilestoneKind =
  /** 記録した日の累計 */
  | "recordedDays"
  /** 起点からの経過日数 */
  | "elapsedDays";

export type Milestone = {
  kind: MilestoneKind;
  /** 節目の値（記録日数なら日数、経過日数なら日数） */
  value: number;
};

/**
 * 記録した日の累計の節目。
 * 累計は書けない日があっても減らないので、中断しても節目が遠のくだけで失われない。
 */
export const RECORDED_DAY_MILESTONES = [1, 3, 7, 14, 30, 50, 100] as const;

/**
 * 起点からの経過日数の節目。1週間・1か月・3か月・6か月・1年。
 * 月は暦月ではなく30日で数える。暦月にすると月の長さで節目の間隔が変わり、
 * 「何日で届くか」を本人が数えられなくなる。
 */
export const ELAPSED_DAY_MILESTONES = [7, 30, 90, 180, 365] as const;

const ELAPSED_MILESTONE_LABELS: Record<number, string> = {
  7: "1週間",
  30: "1か月",
  90: "3か月",
  180: "6か月",
  365: "1年",
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** 連続記録の行を出す下限。1日を「最長1日」と書くと途切れを強調するため2日から */
const MIN_STREAK_TO_SHOW = 2;

export type AccumulationTotals = {
  /** 起点。復職日も記録もない場合は null */
  start: StartPoint | null;
  /** 集計の終端。YYYY-MM-DD */
  today: string;
  /** 起点がすでに来ているか。復職日を未来の日付にしている場合だけ false */
  hasStarted: boolean;
  /**
   * 起点から今日までの経過日数。起点当日は 0。
   * 起点がない、または起点が未来なら 0
   */
  elapsedDays: number;
  /** 起点以降で記録があった日数の累計 */
  recordedDays: number;
  /** 起点以降で「できること」を1つ以上記録した日数の累計 */
  activeDays: number;
  /** 起点以降で続けて記録できた最長日数。連続がなければ 0 */
  longestRecordedStreak: number;
  /** 種類ごとの、到達済みで最大の節目。未到達の種類は含まない */
  reached: Milestone[];
  /** 今日ちょうど到達した節目。ねぎらいを出す条件になる */
  justReached: Milestone[];
  /** 種類ごとの、次の節目。これ以上ない種類は含まない */
  next: Milestone[];
};

function shiftDate(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(base)) return date;
  return new Date(base + days * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * 起点を決める。
 *
 * 本人が設定した復職日を優先し、未設定なら最初に記録した日を既定の起点にする。
 * 何も設定しなくても表示が成立し、設定した時点で本人の選んだ起点に切り替わる。
 */
export function resolveStartPoint(
  records: DailyRecord[],
  returnDate: string | null
): StartPoint | null {
  if (returnDate !== null) return { date: returnDate, source: "returnDate" };

  const earliest = records.reduce<string | null>(
    (oldest, record) =>
      oldest === null || record.date < oldest ? record.date : oldest,
    null
  );
  if (earliest === null) return null;
  return { date: earliest, source: "firstRecord" };
}

/**
 * 連続日数を数える窓の開始日。
 *
 * 起点が何年も前だと日付の列挙が上限（MAX_RANGE_DAYS）を超えて空になるため、
 * 記録がある範囲まで縮める。連続は記録がある日にしか生まれないので結果は変わらない。
 * それでも収まらない場合だけ、直近 MAX_RANGE_DAYS 日へ切り詰める。
 */
function streakWindowStart(
  records: DailyRecord[],
  start: string,
  today: string
): string {
  const earliestRecorded = records.reduce<string | null>(
    (oldest, record) =>
      record.date >= start &&
      record.date <= today &&
      (oldest === null || record.date < oldest)
        ? record.date
        : oldest,
    null
  );

  const from = earliestRecorded ?? start;
  if (countDaysInRange(from, today) <= MAX_RANGE_DAYS) return from;
  return shiftDate(today, -(MAX_RANGE_DAYS - 1));
}

function highestReached(values: readonly number[], current: number): number | null {
  let reached: number | null = null;
  for (const value of values) {
    if (current >= value) reached = value;
  }
  return reached;
}

function nextAhead(values: readonly number[], current: number): number | null {
  for (const value of values) {
    if (current < value) return value;
  }
  return null;
}

function collectMilestones(
  kind: MilestoneKind,
  values: readonly number[],
  current: number,
  into: { reached: Milestone[]; justReached: Milestone[]; next: Milestone[] }
): void {
  const reached = highestReached(values, current);
  if (reached !== null) into.reached.push({ kind, value: reached });

  // ちょうど届いた日だけねぎらう。過ぎた節目を毎日祝うと言葉が軽くなる
  if (values.includes(current)) into.justReached.push({ kind, value: current });

  const next = nextAhead(values, current);
  if (next !== null) into.next.push({ kind, value: next });
}

/**
 * 起点から今日までの積み重ねを数える。
 *
 * 数えるのは起点以降だけとする。起点より前の記録は累計に含めない。
 * 本人が選んだ起点からの積み重ねを見るための表示であり、
 * 起点を動かしたときに数字の意味が変わらないようにするため。
 */
export function summarizeAccumulation(
  records: DailyRecord[],
  returnDate: string | null,
  today: string
): AccumulationTotals {
  const start = resolveStartPoint(records, returnDate);

  if (start === null) {
    return {
      start: null,
      today,
      hasStarted: true,
      elapsedDays: 0,
      recordedDays: 0,
      activeDays: 0,
      longestRecordedStreak: 0,
      reached: [],
      justReached: [],
      next: [],
    };
  }

  const hasStarted = start.date <= today;
  if (!hasStarted) {
    return {
      start,
      today,
      hasStarted: false,
      elapsedDays: 0,
      recordedDays: 0,
      activeDays: 0,
      longestRecordedStreak: 0,
      reached: [],
      justReached: [],
      next: [],
    };
  }

  const target = [...indexRecordsByDate(records, start.date, today).values()];
  const recordedDays = target.length;
  const activeDays = target.filter(
    (record) => record.selfCareIds.length > 0
  ).length;

  // 起点当日を 0 とする経過日数。countDaysInRange は両端を含むので1を引く
  const elapsedDays = countDaysInRange(start.date, today) - 1;

  const streaks = findStreaks(
    records,
    streakWindowStart(records, start.date, today),
    today,
    { metric: "recorded" },
    MIN_STREAK_TO_SHOW
  );
  const longestRecordedStreak = streaks.streaks.reduce(
    (longest, streak) => Math.max(longest, streak.days),
    0
  );

  const collected = {
    reached: [] as Milestone[],
    justReached: [] as Milestone[],
    next: [] as Milestone[],
  };
  collectMilestones("recordedDays", RECORDED_DAY_MILESTONES, recordedDays, collected);
  collectMilestones("elapsedDays", ELAPSED_DAY_MILESTONES, elapsedDays, collected);

  return {
    start,
    today,
    hasStarted: true,
    elapsedDays,
    recordedDays,
    activeDays,
    longestRecordedStreak,
    ...collected,
  };
}

/** 積み重ねの1項目。週次まとめの SummaryLine と同じ形にそろえる */
export type AccumulationLine = {
  id: string;
  label: string;
  /** 数値と単位だけ。評価語を含まない */
  value: string;
  /** 数え方を補う説明 */
  note?: string;
};

/** 節目の到達状況。1種類につき1件 */
export type MilestoneBadge = {
  id: string;
  kind: MilestoneKind;
  label: string;
  /** 到達済みの節目。まだ1つも届いていなければ null */
  reachedLabel: string | null;
  /** つぎの節目。これ以上なければ null */
  nextLabel: string | null;
};

export type AccumulationBoard = {
  start: StartPoint | null;
  today: string;
  /** 起点が決まっていない、または起点がまだ来ていない。表示側が空状態へ分岐する */
  isEmpty: boolean;
  /** 責めない言い方に固定した一文 */
  headline: string;
  lines: AccumulationLine[];
  badges: MilestoneBadge[];
  /** 今日ちょうど節目に届いたときのねぎらい。届いていなければ空配列 */
  messages: string[];
};

function elapsedLabel(days: number): string {
  return ELAPSED_MILESTONE_LABELS[days] ?? `${days}日`;
}

function startNoun(source: StartPointSource): string {
  return source === "returnDate" ? "復職" : "はじめて記録した日";
}

function buildHeadline(totals: AccumulationTotals): string {
  if (totals.start === null) {
    // 「記録がありません」で終わらせない。次に書くときの負担を下げる一文を添える
    return "まだ記録はありません。書けそうなときに、1日分からで大丈夫です。";
  }
  if (!totals.hasStarted) {
    return "設定した復職日は、まだこれからの日付です。その日から数えはじめます。";
  }
  if (totals.recordedDays === 0) {
    return "まだ記録はありません。書けそうなときに、1日分からで大丈夫です。";
  }
  // 「7日中3日しか」「4日は書けていません」とは書かない。残った分だけを述べる
  return `ここまでに${totals.recordedDays}日分の記録が残っています。`;
}

function buildLines(totals: AccumulationTotals): AccumulationLine[] {
  if (totals.start === null || !totals.hasStarted) return [];

  const lines: AccumulationLine[] = [
    {
      id: "recorded-days",
      label: "記録した日",
      value: `${totals.recordedDays}日`,
      note: "書けなかった日があっても減りません",
    },
    {
      id: "active-days",
      label: "できたことがあった日",
      value: `${totals.activeDays}日`,
      note: `記録した${totals.recordedDays}日のうち、「できること」を1つ以上残した日`,
    },
    {
      id: "elapsed-days",
      label:
        totals.start.source === "returnDate"
          ? "復職からの日数"
          : "はじめてからの日数",
      value: totals.elapsedDays === 0 ? "今日から" : `${totals.elapsedDays}日`,
      note:
        totals.start.source === "returnDate"
          ? `復職日（${totals.start.date}）から数えています`
          : `はじめて記録した日（${totals.start.date}）から数えています`,
    },
  ];

  // 連続は最後に1行だけ添える。いま続いている日数は出さない
  if (totals.longestRecordedStreak >= MIN_STREAK_TO_SHOW) {
    lines.push({
      id: "longest-streak",
      label: "続けて書けた日",
      value: `いちばん長く ${totals.longestRecordedStreak}日`,
      note: "途切れても、これまでの記録はそのまま残ります",
    });
  }

  return lines;
}

function buildBadges(totals: AccumulationTotals): MilestoneBadge[] {
  const start = totals.start;
  if (start === null || !totals.hasStarted) return [];

  const find = (kind: MilestoneKind, list: Milestone[]) =>
    list.find((milestone) => milestone.kind === kind) ?? null;

  const format = (kind: MilestoneKind, milestone: Milestone | null) => {
    if (milestone === null) return null;
    return kind === "recordedDays"
      ? `${milestone.value}日`
      : elapsedLabel(milestone.value);
  };

  return (["recordedDays", "elapsedDays"] as const).map((kind) => ({
    id: kind === "recordedDays" ? "milestone-recorded" : "milestone-elapsed",
    kind,
    label:
      kind === "recordedDays"
        ? "記録した日の節目"
        : start.source === "returnDate"
          ? "復職からの節目"
          : "はじめてからの節目",
    reachedLabel: format(kind, find(kind, totals.reached)),
    nextLabel: format(kind, find(kind, totals.next)),
  }));
}

/**
 * 今日ちょうど届いた節目のねぎらい。
 *
 * 本人や結果を評価せず、届いた事実と「おつかれさま」だけにする。
 * 「すごい」「順調」は本人の状態への評価になり、書けなかった日を裏返しに評価する。
 * 「この調子で」「続けましょう」は助言であり、次を求めることになる。
 */
function buildMessages(totals: AccumulationTotals): string[] {
  const start = totals.start;
  if (start === null || !totals.hasStarted) return [];

  return totals.justReached.map((milestone) => {
    if (milestone.kind === "recordedDays") {
      return `記録した日が${milestone.value}日になりました。ここまでおつかれさまです。`;
    }
    return `${startNoun(start.source)}から${elapsedLabel(milestone.value)}です。ここまでおつかれさまです。`;
  });
}

/**
 * 積み重ねの表示を組み立てる。
 *
 * 集計は summarizeAccumulation と既存の findStreaks に任せ、
 * ここは並べ方と言い方だけを決める。数値を表示側で計算しないことで、
 * 画面ごとに数字がずれることを防ぐ。
 */
export function buildAccumulationBoard(
  records: DailyRecord[],
  returnDate: string | null,
  today: string
): AccumulationBoard {
  const totals = summarizeAccumulation(records, returnDate, today);

  return {
    start: totals.start,
    today: totals.today,
    isEmpty: totals.start === null || !totals.hasStarted,
    headline: buildHeadline(totals),
    lines: buildLines(totals),
    badges: buildBadges(totals),
    messages: buildMessages(totals),
  };
}
