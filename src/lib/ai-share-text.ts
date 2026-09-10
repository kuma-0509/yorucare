import {
  formatSelfCareSummary,
  formatSleepSummary,
  getMedicationLabel,
  getMoodLabel,
  getWarningLabel,
} from "./format";
import { COPY } from "./copy";
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

export type AiShareCsvResult =
  | {
      ok: true;
      csv: string;
      recordCount: number;
      filename: string;
    }
  | {
      ok: false;
      message: string;
    };

interface BuildAiShareInput {
  records: DailyRecord[];
  selfCareItems: SelfCareItem[];
  startDate: string;
  endDate: string;
  fields: AiShareField[];
}

const SHARE_FIELD_LABELS: Record<AiShareField, string> = {
  mood: "気分・状態",
  sleep: "睡眠",
  medication: "服薬",
  warning: "しんどさのサイン",
  selfCare: "セルフケア",
  notes: "自由記述",
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 生成AI等へのテキスト共有で、一度に選べる暦日数の上限（開始日と終了日を含む） */
export const MAX_SHARE_DAYS = 30;
const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

export function formatAiSharePeriodLimitHint(): string {
  return COPY.aiShare.periodLimitHint.replace("{n}", String(MAX_SHARE_DAYS));
}

export function formatAiSharePeriodLimitError(): string {
  return COPY.aiShare.periodLimitError.replace("{n}", String(MAX_SHARE_DAYS));
}

/**
 * 端末の標準ビューアや表計算ソフトが日本語として開けるよう、UTF-8 BOM 付きにする。
 * 画面上の全文確認とコピーへ渡す文字列は、呼び出し側でこの関数を通さない。
 */
function createUtf8BomFileBlob(text: string, type: string): Blob {
  const body = new TextEncoder().encode(text);
  const bytes = new Uint8Array(UTF8_BOM.length + body.length);
  bytes.set(UTF8_BOM, 0);
  bytes.set(body, UTF8_BOM.length);
  return new Blob([bytes], { type });
}

export function createAiShareTextFileBlob(text: string): Blob {
  return createUtf8BomFileBlob(text, "text/plain;charset=utf-8");
}

export function createAiShareCsvFileBlob(csv: string): Blob {
  return createUtf8BomFileBlob(csv, "text/csv;charset=utf-8");
}

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

function formatShareFieldValue(
  record: DailyRecord,
  field: AiShareField,
  selfCareItems: SelfCareItem[]
): string {
  switch (field) {
    case "mood":
      return formatMood(record);
    case "sleep":
      return formatSleepSummary(record);
    case "medication":
      return getMedicationLabel(record.medication);
    case "warning":
      return formatWarning(record);
    case "selfCare":
      return formatSelfCare(record, selfCareItems);
    case "notes":
      return record.note.trim() ? indentMultiline(record.note) : "未入力";
  }
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

type AiShareSelection =
  | {
      ok: true;
      selectedRecords: DailyRecord[];
      selectedFields: Set<AiShareField>;
    }
  | {
      ok: false;
      message: string;
    };

function selectAiShareRecords({
  records,
  startDate,
  endDate,
  fields,
}: Omit<BuildAiShareInput, "selfCareItems">): AiShareSelection {
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
      message: formatAiSharePeriodLimitError(),
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

  return { ok: true, selectedRecords, selectedFields };
}

function buildRecordLines(
  record: DailyRecord,
  selfCareItems: SelfCareItem[],
  fields: Set<AiShareField>
): string[] {
  const lines = [`■ ${formatCalendarDate(record.date)}`];

  for (const field of AI_SHARE_FIELDS) {
    if (!fields.has(field)) continue;
    lines.push(
      `- ${SHARE_FIELD_LABELS[field]}: ${formatShareFieldValue(
        record,
        field,
        selfCareItems
      )}`
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
}: BuildAiShareInput): AiShareTextResult {
  const selection = selectAiShareRecords({
    records,
    startDate,
    endDate,
    fields,
  });
  if (!selection.ok) return selection;

  const { selectedRecords, selectedFields } = selection;
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

export function buildAiShareCsv({
  records,
  selfCareItems,
  startDate,
  endDate,
  fields,
}: BuildAiShareInput): AiShareCsvResult {
  const selection = selectAiShareRecords({
    records,
    startDate,
    endDate,
    fields,
  });
  if (!selection.ok) return selection;

  const { selectedRecords, selectedFields } = selection;
  const columns = AI_SHARE_FIELDS.filter((field) => selectedFields.has(field));
  const header = ["日付", ...columns.map((field) => SHARE_FIELD_LABELS[field])];
  const rows = selectedRecords.map((record) => [
    record.date,
    ...columns.map((field) =>
      formatShareFieldValue(record, field, selfCareItems)
    ),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\r\n");

  return {
    ok: true,
    csv,
    recordCount: selectedRecords.length,
    filename: `yorucare-ai-share-${startDate}-${endDate}.csv`,
  };
}
