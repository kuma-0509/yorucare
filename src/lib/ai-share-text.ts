import {
  formatSelfCareSummary,
  formatSleepSummary,
  getMedicationLabel,
  getMoodLabel,
  getWarningLabel,
} from "./format";
import { formatMoodLabelsDisplay } from "./mood-labels";
import type { DailyRecord, SelfCareItem } from "./types";

export const AI_SHARE_FIELDS = [
  "mood",
  "sleep",
  "medication",
  "warning",
  "selfCare",
  "notes",
] as const;

export type AiShareField = (typeof AI_SHARE_FIELDS)[number];

export type AiShareTextResult =
  | {
      ok: true;
      text: string;
      recordCount: number;
      filename: string;
    }
  | {
      ok: false;
      message: string;
    };

interface BuildAiShareTextInput {
  records: DailyRecord[];
  selfCareItems: SelfCareItem[];
  startDate: string;
  endDate: string;
  fields: AiShareField[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SHARE_DAYS = 7;

function parseCalendarDate(value: string): number | null {
  if (!DATE_PATTERN.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  if (new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return timestamp;
}

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function indentMultiline(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" / ");
}

function formatMood(record: DailyRecord): string {
  const parts = [getMoodLabel(record.moodScore)];
  if (record.moodLabels.length > 0) {
    parts.push(formatMoodLabelsDisplay(record.moodLabels));
  }
  return parts.join("／");
}

function formatWarning(record: DailyRecord): string {
  const parts = [getWarningLabel(record.warningLevel)];
  if (record.warningTags.length > 0) {
    parts.push(`項目: ${record.warningTags.join("、")}`);
  }
  if (record.warningNote.trim()) {
    parts.push(`メモ: ${indentMultiline(record.warningNote)}`);
  }
  return parts.join("／");
}

function formatSelfCare(
  record: DailyRecord,
  selfCareItems: SelfCareItem[]
): string {
  const parts = [formatSelfCareSummary(record, selfCareItems)];
  if (record.selfCareMemo.trim()) {
    parts.push(`メモ: ${indentMultiline(record.selfCareMemo)}`);
  }
  return parts.join("／");
}

function buildRecordLines(
  record: DailyRecord,
  selfCareItems: SelfCareItem[],
  fields: Set<AiShareField>
): string[] {
  const lines = [`■ ${formatCalendarDate(record.date)}`];

  if (fields.has("mood")) {
    lines.push(`- 気分・状態: ${formatMood(record)}`);
  }
  if (fields.has("sleep")) {
    lines.push(`- 睡眠: ${formatSleepSummary(record)}`);
  }
  if (fields.has("medication")) {
    lines.push(`- 服薬: ${getMedicationLabel(record.medication)}`);
  }
  if (fields.has("warning")) {
    lines.push(`- しんどさのサイン: ${formatWarning(record)}`);
  }
  if (fields.has("selfCare")) {
    lines.push(`- セルフケア: ${formatSelfCare(record, selfCareItems)}`);
  }
  if (fields.has("notes")) {
    lines.push(
      `- 自由記述: ${
        record.note.trim() ? indentMultiline(record.note) : "未入力"
      }`
    );
  }

  return lines;
}

export function buildAiShareText({
  records,
  selfCareItems,
  startDate,
  endDate,
  fields,
}: BuildAiShareTextInput): AiShareTextResult {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);
  if (start === null || end === null || start > end) {
    return {
      ok: false,
      message: "開始日と終了日を正しい順序で選んでください。",
    };
  }

  const days = Math.floor((end - start) / 86_400_000) + 1;
  if (days > MAX_SHARE_DAYS) {
    return {
      ok: false,
      message: "共有できる期間は7日間までです。",
    };
  }

  const selectedFields = new Set(fields);
  if (selectedFields.size === 0) {
    return {
      ok: false,
      message: "共有する項目を1つ以上選んでください。",
    };
  }

  const selectedRecords = records
    .filter((record) => record.date >= startDate && record.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (selectedRecords.length === 0) {
    return {
      ok: false,
      message: "選んだ期間には共有できる記録がありません。",
    };
  }

  const sections = selectedRecords.map((record) =>
    buildRecordLines(record, selfCareItems, selectedFields).join("\n")
  );

  const text = [
    "ヨルケア 振り返り用テキスト",
    `対象期間: ${formatCalendarDate(startDate)}〜${formatCalendarDate(endDate)}`,
    `記録日数: ${selectedRecords.length}日`,
    "",
    "【生成AIへのお願い】",
    "- 記録にないことを推測せず、記載内容の整理を中心にしてください。",
    "- 診断、治療、処方、危機判定は行わないでください。",
    "- 事実、考えられる傾向、本人に確認したい質問を分けてください。",
    "- 書けなかった日や未入力を責めない表現にしてください。",
    "",
    "【本人が選んだ記録】",
    sections.join("\n\n"),
    "",
    "※このテキストは本人が選んだ項目だけを端末内で整理したものです。",
  ].join("\n");

  return {
    ok: true,
    text,
    recordCount: selectedRecords.length,
    filename: `yorucare-ai-share-${startDate}-${endDate}.txt`,
  };
}
