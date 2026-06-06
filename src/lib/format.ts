import {
  MEDICATION_OPTIONS,
  MOOD_OPTIONS,
  WARNING_LEVEL_OPTIONS,
} from "./constants";
import { COPY } from "./copy";
import { formatMoodLabelsDisplay } from "./mood-labels";
import { formatSleepDuration } from "./sleep";
import type { DailyRecord, SelfCareItem } from "./types";

const EMPTY_VALUES = new Set([
  "未入力",
  "未計算",
  "—",
  COPY.notEntered,
  COPY.sleepNotEntered,
]);

export function isMeaningfulSummaryValue(value: string): boolean {
  return value.trim().length > 0 && !EMPTY_VALUES.has(value);
}

export function getMoodLabel(score: DailyRecord["moodScore"]): string {
  if (score === null) return COPY.notEntered;
  return MOOD_OPTIONS.find((o) => o.score === score)?.label ?? COPY.notEntered;
}

export function getMedicationLabel(
  value: DailyRecord["medication"]
): string {
  if (value === null) return COPY.notEntered;
  return MEDICATION_OPTIONS.find((o) => o.value === value)?.label ?? COPY.notEntered;
}

export function getWarningLabel(
  value: DailyRecord["warningLevel"]
): string {
  if (value === null) return COPY.notEntered;
  return WARNING_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? COPY.notEntered;
}

export function formatSleepSummary(record: DailyRecord): string {
  if (!record.sleepStart && !record.sleepEnd) return COPY.notEntered;
  if (!record.sleepStart || !record.sleepEnd) {
    return COPY.notEntered;
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
  if (titles.length === 0) return COPY.notEntered;
  return titles.join("、");
}

export function buildRecordSummaryLines(
  record: DailyRecord,
  selfCareItems: SelfCareItem[]
): { label: string; value: string }[] {
  const candidates: { label: string; value: string }[] = [
    { label: "気分", value: getMoodLabel(record.moodScore) },
  ];

  if (record.moodLabels.length > 0) {
    candidates.push({
      label: "気持ち",
      value: formatMoodLabelsDisplay(record.moodLabels),
    });
  }

  candidates.push(
    { label: "睡眠", value: formatSleepSummary(record) },
    { label: "お薬", value: getMedicationLabel(record.medication) },
    { label: COPY.warningSign, value: getWarningLabel(record.warningLevel) }
  );

  const selfCare = formatSelfCareSummary(record, selfCareItems);
  if (isMeaningfulSummaryValue(selfCare)) {
    candidates.push({ label: COPY.doneToday, value: selfCare });
  }

  return candidates.filter((line) => isMeaningfulSummaryValue(line.value));
}
