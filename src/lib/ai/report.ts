import { NARRATIVE_MAX_LENGTH } from "./narrative-guard";
import { summarizePeriod, type PeriodSummary } from "./period-summary";
import { indexRecordsByDate } from "./range";
import { COPY } from "../copy";
import type { DailyRecord, MoodScore, SelfCareItem } from "../types";

/**
 * 期間の報告書。穴埋め方式で組み立てる。
 *
 * 数値の穴はこの層が埋め、文章の穴だけを LLM が書く。
 * 集計そのものは既存のツール層（`summarizePeriod`）に任せ、
 * ここは並べ方と言い方だけを決める。数値を自前で計算し直さないことで、
 * 画面・週次まとめ・報告書で数字がずれない。
 *
 * ## 載せる項目
 *
 * `docs/sharing-decision.md` 5節の「対人共有の初期版で選択できる項目」に合わせる。
 * 対象期間、記録した日数、状態の推移、睡眠時間の推移、できたことがあった日数だけを載せ、
 * 服薬、しんどさのサイン、タグ、メモ、できることの名前、カスタム状態ラベルは載せない。
 * 就寝時刻も載せない（同節が「時刻ではなく時間量の推移だけ」としているため）。
 *
 * ## 型で保証すること
 *
 * この型には note / warningNote / selfCareMemo / tomorrowGoal を持たせない。
 * 復職日（`STORAGE_KEYS.returnDate`）も持たせない。
 * `docs/ai-consent-decision.md` 1節・3節の方針を、運用ルールではなく型で保証する。
 * 骨格そのものが LLM への依頼データになるため、LLM は報告書に出ている以上のことを知らない。
 */

/** 文章の穴の識別子。節の識別子と共通にする */
export const REPORT_SLOT_IDS = ["overview", "mood", "sleep", "selfCare"] as const;

export type ReportSlotId = (typeof REPORT_SLOT_IDS)[number];

/** アプリが確定させた数値の行。ここに評価語を入れない */
export type ReportFact = {
  id: string;
  label: string;
  /** 数値と単位だけ */
  value: string;
  /** 母数など、数値の読み方を補う説明 */
  note?: string;
};

/** 穴に入れてよい文。文面はアプリが書き、`COPY` から取る */
export type ReportNarrativeCandidate = {
  id: string;
  text: string;
};

/**
 * 文章の穴。
 *
 * LLM は `candidates` から1つ選ぶだけで、文そのものは書かない。
 * 出せる文がアプリの書いたものに限られるので、
 * 渡していない主張（診断・治療・助言）が報告書へ入る経路が無い。
 */
export type ReportSlot = {
  id: ReportSlotId;
  /** LLM へ渡す指示。画面には出さない */
  purpose: string;
  maxLength: number;
  /** 選べる文。先頭が既定 */
  candidates: ReportNarrativeCandidate[];
};

/** 選ばれなかったときに使う文 */
export function fallbackNarrative(slot: ReportSlot): string {
  return slot.candidates[0].text;
}

export type ReportSection = {
  id: ReportSlotId;
  title: string;
  facts: ReportFact[];
  slot: ReportSlot;
};

export type ReportSkeleton = {
  range: { from: string; to: string };
  daysInRange: number;
  recordedDays: number;
  /** 記録がない期間かどうか。表示側が空状態へ分岐するために使う */
  isEmpty: boolean;
  /** 責めない言い方に固定した一文。ここは LLM に書かせない */
  headline: string;
  sections: ReportSection[];
  notice: string;
};

/** 文章の穴を、LLM か定型のどちらで埋めたか */
export type NarrativeSource = "llm" | "fallback";

export type FilledSection = ReportSection & {
  narrative: string;
  narrativeSource: NarrativeSource;
};

export type Report = Omit<ReportSkeleton, "sections"> & {
  sections: FilledSection[];
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
  return {
    min: Math.min(...scores) as MoodScore,
    max: Math.max(...scores) as MoodScore,
  };
}

/**
 * 「できること」を1つ以上実行した日数。
 *
 * 辞書から消えた項目は解決できないため数えない（`listSelfCare` と揃える）。
 * 母数は「記録があった日数」で、記録がない日を実行しなかった日として数えない。
 */
export function countSelfCareDoneDays(
  records: DailyRecord[],
  selfCareItems: SelfCareItem[],
  from: string,
  to: string
): number {
  const known = new Set(selfCareItems.map((item) => item.id));
  let days = 0;
  for (const record of indexRecordsByDate(records, from, to).values()) {
    if (record.selfCareIds.some((id) => known.has(id))) days += 1;
  }
  return days;
}

function buildHeadline(recordedDays: number, daysInRange: number): string {
  // 「7日中3日しか」「4日は記録がありません」とは書かない。
  // 記録できないほどしんどかった日を、本人の失敗として提示しない。
  if (recordedDays === 0) return COPY.report.emptyHeadline;
  if (recordedDays >= daysInRange) {
    return `この${daysInRange}日間、毎日記録できています。`;
  }
  return `この${daysInRange}日間で、${recordedDays}日分の記録が残りました。`;
}

function slot(
  id: ReportSlotId,
  purpose: string,
  candidates: readonly string[]
): ReportSlot {
  return {
    id,
    purpose,
    maxLength: NARRATIVE_MAX_LENGTH,
    candidates: candidates.map((text, index) => ({
      id: `${id}-${index + 1}`,
      text,
    })),
  };
}

/**
 * 期間の記録から報告書の骨格を作る。
 *
 * 数値が無い節は、節ごと省く。
 * 「0」を並べると、記録できなかったことが不足として読まれるため。
 */
export function buildReportSkeleton(
  records: DailyRecord[],
  selfCareItems: SelfCareItem[],
  from: string,
  to: string
): ReportSkeleton {
  const summary = summarizePeriod(records, from, to);
  const { daysInRange, recordedDays } = summary;

  // 対象期間そのものは `range` として別に持ち、見出しへ出す。
  // 数値の行へ重ねて並べると、テキストにした報告書で同じ行が二度出る。
  const overviewFacts: ReportFact[] = [];
  if (recordedDays > 0) {
    overviewFacts.push({
      id: "recorded-days",
      label: COPY.report.factRecordedDays,
      value: `${recordedDays}日`,
      note: `対象の${daysInRange}日間のうち`,
    });
  }

  const sections: ReportSection[] = [
    {
      id: "overview",
      title: COPY.report.sectionPeriod,
      facts: overviewFacts,
      slot: slot(
        "overview",
        "対象期間と記録の量を、評価せずに一文で述べる",
        COPY.report.narrativeOverview
      ),
    },
  ];

  if (summary.mood.averageScore !== null) {
    const range = moodRange(summary);
    const facts: ReportFact[] = [
      {
        id: "mood-average",
        label: COPY.report.factMoodAverage,
        value: `${summary.mood.averageScore}（5段階）`,
        note: `記録した${summary.mood.scoredDays}日分`,
      },
    ];
    if (range) {
      facts.push({
        id: "mood-range",
        label: COPY.report.factMoodRange,
        value: `${range.min}〜${range.max}`,
        note: `記録した${summary.mood.scoredDays}日分`,
      });
    }
    sections.push({
      id: "mood",
      title: COPY.report.sectionMood,
      facts,
      slot: slot(
        "mood",
        "気分の数値の読み方を、評価せずに一文で述べる",
        COPY.report.narrativeMood
      ),
    });
  }

  if (summary.sleep.averageMinutes !== null) {
    const facts: ReportFact[] = [
      {
        id: "sleep-average",
        label: COPY.report.factSleepAverage,
        value: formatDuration(summary.sleep.averageMinutes),
        note: `記録した${summary.sleep.measuredDays}日分`,
      },
    ];
    if (summary.sleep.deviationMinutes !== null) {
      facts.push({
        id: "sleep-deviation",
        label: COPY.report.factSleepDeviation,
        value: `前後${formatDuration(summary.sleep.deviationMinutes)}ほど`,
        note: `記録した${summary.sleep.measuredDays}日分`,
      });
    }
    sections.push({
      id: "sleep",
      title: COPY.report.sectionSleep,
      facts,
      slot: slot(
        "sleep",
        "睡眠時間の数値の読み方を、評価せずに一文で述べる",
        COPY.report.narrativeSleep
      ),
    });
  }

  const selfCareDays = countSelfCareDoneDays(records, selfCareItems, from, to);
  if (selfCareDays > 0) {
    sections.push({
      id: "selfCare",
      title: COPY.report.sectionSelfCare,
      facts: [
        {
          id: "self-care-days",
          label: COPY.report.factSelfCareDays,
          value: `${selfCareDays}日`,
          // できることの名前は載せない（sharing-decision 5節で対象外）
          note: `記録した${recordedDays}日分のうち`,
        },
      ],
      slot: slot(
        "selfCare",
        "できたことがあった日数の読み方を、評価せずに一文で述べる",
        COPY.report.narrativeSelfCare
      ),
    });
  }

  return {
    range: summary.range,
    daysInRange,
    recordedDays,
    isEmpty: recordedDays === 0,
    headline: buildHeadline(recordedDays, daysInRange),
    sections,
    notice: COPY.report.notice,
  };
}

/**
 * 文章の穴をすべて定型文で埋める。
 *
 * LLM を呼ばない経路。外部通信を行わないため、既定の表示はこれで成立する。
 */
export function buildReport(skeleton: ReportSkeleton): Report {
  return {
    ...skeleton,
    sections: skeleton.sections.map((section) => ({
      ...section,
      narrative: fallbackNarrative(section.slot),
      narrativeSource: "fallback" as const,
    })),
  };
}

/**
 * 報告書を共有用のプレーンテキストにする。
 *
 * 端末内で組み立てるだけで、どこへも送信しない。
 * 渡す先を選ぶのは本人の操作で、既存の共有導線と同じ扱いにする。
 */
export function buildReportText(report: Report): string {
  const lines: string[] = [
    `${COPY.productName} ${COPY.report.title}`,
    `期間: ${report.range.from} 〜 ${report.range.to}`,
    "",
    report.headline,
  ];

  for (const section of report.sections) {
    lines.push("");
    lines.push(`【${section.title}】`);
    lines.push(section.narrative);
    for (const fact of section.facts) {
      lines.push(
        fact.note
          ? `${fact.label}: ${fact.value}（${fact.note}）`
          : `${fact.label}: ${fact.value}`
      );
    }
  }

  lines.push("");
  lines.push(`※ ${report.notice}`);
  lines.push(`※ ${COPY.report.description}`);

  return lines.join("\n");
}
