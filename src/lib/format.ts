import {
  MEDICATION_OPTIONS,
  MOOD_OPTIONS,
  WARNING_LEVEL_OPTIONS,
} from "./constants";
import { formatSleepDuration } from "./sleep";
import type { DailyRecord, SelfCareItem } from "./types";

export function getMoodLabel(score: DailyRecord["moodScore"]): string {
  if (score === null) return "未入力";
  return MOOD_OPTIONS.find((o) => o.score === score)?.label ?? "未入力";
}

export function getMedicationLabel(
  value: DailyRecord["medication"]
): string {
  if (value === null) return "未入力";
  return MEDICATION_OPTIONS.find((o) => o.value === value)?.label ?? "未入力";
}

export function getWarningLabel(
  value: DailyRecord["warningLevel"]
): string {
  if (value === null) return "未入力";
  return WARNING_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? "未入力";
}

export function formatSleepSummary(record: DailyRecord): string {
  if (!record.sleepStart && !record.sleepEnd) return "未入力";
  if (!record.sleepStart || !record.sleepEnd) {
    return "未計算";
  }
  const duration = formatSleepDuration(record.sleepMinutes);
  return `${record.sleepStart}〜${record.sleepEnd}（${duration}）`;
}

export function formatSelfCareSummary(
  record: DailyRecord,
  items: SelfCareItem[]
): string {
  const titles = record.selfCareIds
    .map((id) => items.find((i) => i.id === id)?.title)
    .filter(Boolean) as string[];
  if (titles.length === 0) return "未入力";
  return titles.join("、");
}

export function buildRecordSummaryLines(
  record: DailyRecord,
  selfCareItems: SelfCareItem[]
): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];

  lines.push({
    label: "気分",
    value: getMoodLabel(record.moodScore),
  });

  if (record.moodLabels.length > 0) {
    lines.push({
      label: "気持ち",
      value: record.moodLabels.join("、"),
    });
  }

  lines.push({
    label: "睡眠",
    value: formatSleepSummary(record),
  });

  lines.push({
    label: "服薬",
    value: getMedicationLabel(record.medication),
  });

  lines.push({
    label: "注意サイン",
    value: getWarningLabel(record.warningLevel),
  });

  const selfCare = formatSelfCareSummary(record, selfCareItems);
  if (selfCare !== "未入力") {
    lines.push({ label: "セルフケア", value: selfCare });
  }

  return lines;
}
