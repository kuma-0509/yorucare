import { listSelfCare, listWarningTags } from "./frequency";
import { summarizePeriod, type PeriodSummary } from "./period-summary";
import { findStreaks } from "./streaks";
import type { DailyRecord, MoodScore, SelfCareItem } from "../types";

/**
 * 週次まとめの文面を、定型ルールだけで組み立てる。
 *
 * ここではLLMを呼ばない。
 * 週次まとめは毎週同じ切り口で読むものなので、言い方が週ごとにぶれるほうが
 * 本人にとって不安になる。速く、無料で、毎回同じ言葉になるほうが良い。
 *
 * 文面の作り方には次の制約を置く。守るのは表示側ではなくこの層の仕事とする。
 *
 * 1. 記録がなかった日を「抜けた」「できなかった」と書かない。
 *    記録できないほどしんどかった日を、本人の失敗として提示しない。
 * 2. 評価語（よい、悪い、改善、悪化）と助言（〜しましょう）を出さない。
 *    ヨルケアは診断・治療の代替ではなく、判断は本人と支援者・医師が行う。
 * 3. 数値には必ず母数を添える。3日分の平均を7日分の傾向として読ませない。
 * 4. 割合ではなく日数で示す。「達成率67%」は達成できなかった側を強調する。
 */

/** まとめの対象期間の日数 */
export const WEEKLY_SUMMARY_DAYS = 7;

/** 見出しの下に並べる1項目 */
export type SummaryLine = {
  id: string;
  label: string;
  /** 数値と単位だけ。評価語を含まない */
  value: string;
  /** 母数など、数値の読み方を補う説明 */
  note?: string;
};

export type SummaryHighlight = {
  id: string;
  label: string;
  items: string[];
};

export type WeeklySummary = {
  range: { from: string; to: string };
  daysInRange: number;
  recordedDays: number;
  /** 記録がない期間かどうか。表示側が空状態へ分岐するために使う */
  isEmpty: boolean;
  /** 責めない言い方に固定した一文 */
  headline: string;
  lines: SummaryLine[];
  highlights: SummaryHighlight[];
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

function moodRange(summary: PeriodSummary): { min: MoodScore; max: MoodScore } | null {
  const scores = (Object.keys(summary.mood.distribution) as unknown as MoodScore[])
    .map((key) => Number(key) as MoodScore)
    .filter((score) => summary.mood.distribution[score] > 0);
  if (scores.length === 0) return null;
  return { min: Math.min(...scores) as MoodScore, max: Math.max(...scores) as MoodScore };
}

function buildHeadline(recordedDays: number, daysInRange: number): string {
  if (recordedDays === 0) {
    // 「記録がありません」で終わらせない。次に書くときの負担を下げる一文を添える
    return "この期間の記録はまだありません。書けそうなときに、1日分からで大丈夫です。";
  }
  if (recordedDays >= daysInRange) {
    return `この${daysInRange}日間、毎日記録できています。`;
  }
  // 「7日中3日しか」「4日は記録がありません」とは書かない
  return `この${daysInRange}日間で、${recordedDays}日分の記録が残りました。`;
}

function buildLines(summary: PeriodSummary, longestStreak: number): SummaryLine[] {
  const lines: SummaryLine[] = [];
  const { mood, sleep, medication, warning } = summary;

  if (mood.averageScore !== null) {
    const range = moodRange(summary);
    lines.push({
      id: "mood",
      label: "気分",
      value: `平均 ${mood.averageScore}（5段階）`,
      note: range
        ? `記録した${mood.scoredDays}日分・${range.min}〜${range.max}の幅`
        : `記録した${mood.scoredDays}日分`,
    });
  }

  if (sleep.averageMinutes !== null) {
    lines.push({
      id: "sleep-duration",
      label: "睡眠時間",
      value: `平均 ${formatDuration(sleep.averageMinutes)}`,
      note:
        sleep.deviationMinutes !== null
          ? `記録した${sleep.measuredDays}日分・日による差は前後${formatDuration(sleep.deviationMinutes)}ほど`
          : `記録した${sleep.measuredDays}日分`,
    });
  }

  if (sleep.medianBedtime !== null) {
    lines.push({
      id: "bedtime",
      label: "就寝時刻",
      value: `だいたい ${sleep.medianBedtime} ごろ`,
      note: `記録した${sleep.bedtimeDays}日分の真ん中`,
    });
  }

  if (medication.answeredDays > 0) {
    const { done, partial } = medication.countByStatus;
    // 割合ではなく日数で示す。達成率にすると、できなかった側が強調される
    const parts = [`できた ${done}日`];
    if (partial > 0) parts.push(`一部できた ${partial}日`);
    lines.push({
      id: "medication",
      label: "服薬",
      value: parts.join("・"),
      note: `服薬について答えた${medication.answeredDays}日分`,
    });
  }

  if (warning.answeredDays > 0) {
    const { none, small, yes } = warning.countByLevel;
    const parts: string[] = [];
    if (yes > 0) parts.push(`あり ${yes}日`);
    if (small > 0) parts.push(`少し ${small}日`);
    if (none > 0) parts.push(`なし ${none}日`);
    lines.push({
      id: "warning",
      label: "しんどさのサイン",
      value: parts.join("・"),
      note: `サインについて答えた${warning.answeredDays}日分`,
    });
  }

  if (longestStreak >= 2) {
    lines.push({
      id: "streak",
      label: "続けて記録できた日",
      value: `最長 ${longestStreak}日`,
    });
  }

  return lines;
}

const MAX_HIGHLIGHT_ITEMS = 3;

/**
 * 期間内の記録から週次まとめを組み立てる。
 *
 * 集計は既存のツール層に任せ、ここは並べ方と言い方だけを決める。
 * 数値を自前で計算しないことで、画面と報告書で数字がずれることを防ぐ。
 */
export function buildWeeklySummary(
  records: DailyRecord[],
  selfCareItems: SelfCareItem[],
  from: string,
  to: string
): WeeklySummary {
  const summary = summarizePeriod(records, from, to);
  const streaks = findStreaks(records, from, to, { metric: "recorded" }, 2);
  const longestStreak = streaks.streaks.reduce(
    (longest, streak) => Math.max(longest, streak.days),
    0
  );

  const highlights: SummaryHighlight[] = [];
  const tags = listWarningTags(records, from, to);
  if (tags.entries.length > 0) {
    highlights.push({
      id: "warning-tags",
      label: "よく選んだサイン",
      items: tags.entries
        .slice(0, MAX_HIGHLIGHT_ITEMS)
        .map((entry) => `${entry.name}（${entry.days}日）`),
    });
  }

  const selfCare = listSelfCare(records, selfCareItems, from, to);
  if (selfCare.entries.length > 0) {
    highlights.push({
      id: "self-care",
      label: "よく実行したこと",
      items: selfCare.entries
        .slice(0, MAX_HIGHLIGHT_ITEMS)
        .map((entry) => `${entry.name}（${entry.days}日）`),
    });
  }

  return {
    range: summary.range,
    daysInRange: summary.daysInRange,
    recordedDays: summary.recordedDays,
    isEmpty: summary.recordedDays === 0,
    headline: buildHeadline(summary.recordedDays, summary.daysInRange),
    lines: buildLines(summary, longestStreak),
    highlights,
  };
}

/**
 * まとめを共有用のプレーンテキストにする。
 *
 * 端末内で組み立てるだけで、どこへも送信しない。
 * 渡す先を選ぶのは本人の操作で、既存の共有導線と同じ扱いにする。
 */
export function buildWeeklySummaryText(summary: WeeklySummary): string {
  const lines: string[] = [
    "ヨルケア 週のまとめ",
    `期間: ${summary.range.from} 〜 ${summary.range.to}`,
    "",
    summary.headline,
  ];

  if (summary.lines.length > 0) {
    lines.push("");
    for (const line of summary.lines) {
      lines.push(
        line.note
          ? `${line.label}: ${line.value}（${line.note}）`
          : `${line.label}: ${line.value}`
      );
    }
  }

  for (const highlight of summary.highlights) {
    lines.push("");
    lines.push(`${highlight.label}: ${highlight.items.join("、")}`);
  }

  lines.push("");
  lines.push("※ このまとめは記録した内容をそのまま数えたものです。診断や治療の判断には使えません。");

  return lines.join("\n");
}
