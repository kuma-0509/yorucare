import { CHANGE_THRESHOLDS } from "./change-thresholds";
import { listWarningTags } from "./frequency";
import { summarizePeriod } from "./period-summary";
import { indexRecordsByDate } from "./range";
import type { DailyRecord, MoodScore } from "../types";

/**
 * 直近の記録から「見える変化」を事実として並べる。
 *
 * ここは判定ではない。次のことをしない。
 *
 * 1. 状態にラベルを付けない（「不調」「悪化」「要注意」を出さない）。
 * 2. 危険度・緊急度を推定しない。閾値を超えても表示の強さを変えない。
 * 3. 評価語（よい・悪い・改善・悪化）と助言（〜しましょう）を出さない。
 * 4. 記録がなかった日を「抜けた」「できなかった」と書かない。
 *
 * 数値には必ず母数を添え、割合ではなく日数で示す。
 * 対象が0件の項目は 0 ではなく null にして、
 * 「値が低い」と「データがない」を型で区別する。
 *
 * 戻り値にはメモ本文（note / warningNote / selfCareMemo）のフィールドを置かない。
 * `docs/ai-consent-decision.md` の方針を、運用ルールではなく型で保証する。
 */

/** 事実1件。母数は必ず持つ */
export type ChangeMetric = {
  /** 数えた日数 */
  days: number;
  /** その数え方の母数となった日数 */
  denominator: number;
};

export type TopWarningTagMetric = ChangeMetric & { name: string };

export type SleepMedianMetric = {
  minutes: number;
  denominator: number;
};

/**
 * 集計値。対象が0件のときは 0 ではなく null。
 * 表示側は null を「データがない」として扱い、0日として書かない。
 */
export type ChangeMetrics = {
  /** 気分が閾値以下だった日数 */
  lowMoodDays: ChangeMetric | null;
  /** 睡眠時間の中央値 */
  sleepMedian: SleepMedianMetric | null;
  /** 睡眠時間が閾値以下だった日数 */
  shortSleepDays: ChangeMetric | null;
  /** お薬を「忘れた」と記録した日数 */
  medicationForgotDays: ChangeMetric | null;
  /** しんどさのサインが「あり」だった日数 */
  warningDays: ChangeMetric | null;
  /** 最も多かったしんどさのサイン */
  topWarningTag: TopWarningTagMetric | null;
};

/** 画面と共有テキストで同じ文字列を使うための1行 */
export type ChangeFact = {
  id: string;
  label: string;
  /** 数値と単位だけ。評価語を含まない */
  value: string;
  /** 母数など、数値の読み方を補う説明 */
  note: string;
};

export type ChangeDetectionResult = {
  range: { from: string; to: string };
  /** 期間の暦日数 */
  daysInRange: number;
  /** 記録があった日数 */
  recordedDays: number;
  /** 記録が1日もない期間か。表示側が空状態へ分岐するために使う */
  isEmpty: boolean;
  metrics: ChangeMetrics;
  facts: ChangeFact[];
  /** 表示に必ず添える一文 */
  disclaimer: string;
};

export const CHANGE_DISCLAIMER =
  "これは診断ではなく、本人の記録の集計です。";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

function moodLabelForThreshold(score: MoodScore): string {
  switch (score) {
    case 1:
      return "かなりしんどい";
    case 2:
      return "少ししんどい";
    case 3:
      return "ふつう";
    case 4:
      return "まあまあ良い";
    case 5:
      return "かなり良い";
  }
}

/** 母数が足りない項目は null。0日として並べない */
function metricOrNull(days: number, denominator: number): ChangeMetric | null {
  if (denominator < CHANGE_THRESHOLDS.minDenominator) return null;
  return { days, denominator };
}

/**
 * 期間内の記録から事実を組み立てる。
 *
 * 集計は既存のツール層（`summarizePeriod` / `listWarningTags`）に任せ、
 * ここは何を数えるかと言い方だけを決める。
 * 数値を自前で計算しないことで、週のまとめと数字がずれない。
 */
export function detectChanges(
  records: DailyRecord[],
  from: string,
  to: string
): ChangeDetectionResult {
  const summary = summarizePeriod(records, from, to);
  const { mood, sleep, medication, warning } = summary;

  const lowMoodCount = (
    Object.keys(mood.distribution) as unknown as string[]
  ).reduce((total, key) => {
    const score = Number(key) as MoodScore;
    return score <= CHANGE_THRESHOLDS.lowMoodAtMost
      ? total + mood.distribution[score]
      : total;
  }, 0);

  // 期間の切り出しは range 側に任せる。日付が重複しても1日として数える
  const shortSleepCount = [
    ...indexRecordsByDate(records, from, to).values(),
  ].filter(
    (record) =>
      record.sleepMinutes !== null &&
      record.sleepMinutes <= CHANGE_THRESHOLDS.shortSleepMinutesAtMost
  ).length;

  const forgotCount = CHANGE_THRESHOLDS.countedMedicationStatuses.reduce(
    (total, status) => total + medication.countByStatus[status],
    0
  );

  const warningCount = CHANGE_THRESHOLDS.countedWarningLevels.reduce(
    (total, level) => total + warning.countByLevel[level],
    0
  );

  const tags = listWarningTags(records, from, to);
  const topTag = tags.entries[0];

  const metrics: ChangeMetrics = {
    lowMoodDays: metricOrNull(lowMoodCount, mood.scoredDays),
    sleepMedian:
      sleep.medianMinutes === null ||
      sleep.measuredDays < CHANGE_THRESHOLDS.minDenominator
        ? null
        : { minutes: sleep.medianMinutes, denominator: sleep.measuredDays },
    shortSleepDays: metricOrNull(shortSleepCount, sleep.measuredDays),
    medicationForgotDays: metricOrNull(forgotCount, medication.answeredDays),
    warningDays: metricOrNull(warningCount, warning.answeredDays),
    topWarningTag:
      topTag === undefined || tags.recordedDays < CHANGE_THRESHOLDS.minDenominator
        ? null
        : {
            name: topTag.name,
            days: topTag.days,
            denominator: tags.recordedDays,
          },
  };

  return {
    range: summary.range,
    daysInRange: summary.daysInRange,
    recordedDays: summary.recordedDays,
    isEmpty: summary.recordedDays === 0,
    metrics,
    facts: buildFacts(metrics),
    disclaimer: CHANGE_DISCLAIMER,
  };
}

/**
 * 事実を表示用の1行にする。
 *
 * 「7日中4日」のように、母数は記録があった日数で書く。
 * 記録がなかった日を分母に含めると、書けなかった日が
 * 「条件を満たさなかった日」として数えられてしまう。
 */
function buildFacts(metrics: ChangeMetrics): ChangeFact[] {
  const facts: ChangeFact[] = [];
  const moodLabel = moodLabelForThreshold(CHANGE_THRESHOLDS.lowMoodAtMost);

  if (metrics.lowMoodDays) {
    facts.push({
      id: "low-mood-days",
      label: `気分が「${moodLabel}」以下だった日`,
      value: `${metrics.lowMoodDays.days}日`,
      note: `気分を記録した${metrics.lowMoodDays.denominator}日分のうち`,
    });
  }

  if (metrics.sleepMedian) {
    facts.push({
      id: "sleep-median",
      label: "睡眠時間の中央値",
      value: formatDuration(metrics.sleepMedian.minutes),
      note: `睡眠を記録した${metrics.sleepMedian.denominator}日分`,
    });
  }

  if (metrics.shortSleepDays) {
    facts.push({
      id: "short-sleep-days",
      label: `睡眠時間が${formatDuration(
        CHANGE_THRESHOLDS.shortSleepMinutesAtMost
      )}以下だった日`,
      value: `${metrics.shortSleepDays.days}日`,
      note: `睡眠を記録した${metrics.shortSleepDays.denominator}日分のうち`,
    });
  }

  if (metrics.medicationForgotDays) {
    facts.push({
      id: "medication-forgot-days",
      label: "お薬を「忘れた」と記録した日",
      value: `${metrics.medicationForgotDays.days}日`,
      note: `服薬について答えた${metrics.medicationForgotDays.denominator}日分のうち`,
    });
  }

  if (metrics.warningDays) {
    facts.push({
      id: "warning-days",
      label: "しんどさのサインを「あり」と記録した日",
      value: `${metrics.warningDays.days}日`,
      note: `サインについて答えた${metrics.warningDays.denominator}日分のうち`,
    });
  }

  if (metrics.topWarningTag) {
    facts.push({
      id: "top-warning-tag",
      label: "しんどさのサインで最も多かった項目",
      value: metrics.topWarningTag.name,
      note: `記録があった${metrics.topWarningTag.denominator}日分のうち${metrics.topWarningTag.days}日`,
    });
  }

  return facts;
}

/** 共有テキストへ差し込む行。母数を落とさない */
export function formatChangeFactLine(fact: ChangeFact): string {
  return `${fact.label}: ${fact.value}（${fact.note}）`;
}
