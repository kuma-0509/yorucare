import { COPY } from "./copy";
import { formatTableDate } from "./dates";
import {
  formatNotToDoSummary,
  formatSelfCareSummary,
  formatSleepSummary,
  getMedicationLabel,
  getMoodLabel,
  getWarningLabel,
  isMeaningfulSummaryValue,
} from "./format";
import { formatMoodLabelsDisplay } from "./mood-labels";
import { isDailyRecordEmpty } from "./repository";
import type { DailyRecord, NotToDoItem, SelfCareItem } from "./types";

export type RecordsTableColumnKey =
  | "mood"
  | "moodLabels"
  | "sleep"
  | "medication"
  | "warning"
  | "doneToday"
  | "notToDo"
  | "memo";

export type RecordsTableRowKind = "missing" | "empty" | "filled";

export interface RecordsTableColumn {
  key: RecordsTableColumnKey;
  label: string;
}

export interface RecordsTableRow {
  date: string;
  displayDate: string;
  kind: RecordsTableRowKind;
  cells: Record<RecordsTableColumnKey, string>;
}

const CORE_BEFORE_OPTIONAL: RecordsTableColumn[] = [
  { key: "mood", label: COPY.recordsList.mood },
];

const CORE_AFTER_MOOD: RecordsTableColumn[] = [
  { key: "sleep", label: COPY.sleep.title },
];

const CORE_TRAILING: RecordsTableColumn[] = [
  { key: "memo", label: COPY.memo },
];

const OPTIONAL_COLUMNS: RecordsTableColumn[] = [
  { key: "moodLabels", label: COPY.recordsList.moodLabels },
  { key: "medication", label: COPY.recordsList.medication },
  { key: "warning", label: COPY.warningSign },
  { key: "doneToday", label: COPY.doneToday },
  { key: "notToDo", label: COPY.notToDoAction },
];

function emptyCells(): Record<RecordsTableColumnKey, string> {
  return {
    mood: COPY.recordsList.emptyCell,
    moodLabels: COPY.recordsList.emptyCell,
    sleep: COPY.recordsList.emptyCell,
    medication: COPY.recordsList.emptyCell,
    warning: COPY.recordsList.emptyCell,
    doneToday: COPY.recordsList.emptyCell,
    notToDo: COPY.recordsList.emptyCell,
    memo: COPY.recordsList.emptyCell,
  };
}

function cellValue(value: string): string {
  return isMeaningfulSummaryValue(value) ? value : COPY.recordsList.emptyCell;
}

function cellsForRecord(
  record: DailyRecord,
  selfCareItems: SelfCareItem[],
  notToDoItems: NotToDoItem[]
): Record<RecordsTableColumnKey, string> {
  return {
    mood: cellValue(getMoodLabel(record.moodScore)),
    moodLabels: cellValue(formatMoodLabelsDisplay(record.moodLabels)),
    sleep: cellValue(formatSleepSummary(record)),
    medication: cellValue(getMedicationLabel(record.medication)),
    warning: cellValue(getWarningLabel(record.warningLevel)),
    doneToday: cellValue(formatSelfCareSummary(record, selfCareItems)),
    notToDo: cellValue(formatNotToDoSummary(record, notToDoItems)),
    memo: cellValue(record.note),
  };
}

export function buildRecordsTable(options: {
  daysNewestFirst: string[];
  records: DailyRecord[];
  selfCareItems: SelfCareItem[];
  notToDoItems: NotToDoItem[];
}): { columns: RecordsTableColumn[]; rows: RecordsTableRow[] } {
  const { daysNewestFirst, records, selfCareItems, notToDoItems } = options;
  const byDate = new Map(records.map((record) => [record.date, record]));

  const rows: RecordsTableRow[] = daysNewestFirst.map((date) => {
    const record = byDate.get(date);
    if (!record) {
      return {
        date,
        displayDate: formatTableDate(date),
        kind: "missing",
        cells: emptyCells(),
      };
    }

    return {
      date,
      displayDate: formatTableDate(date),
      kind: isDailyRecordEmpty(record) ? "empty" : "filled",
      cells: cellsForRecord(record, selfCareItems, notToDoItems),
    };
  });

  const optional = OPTIONAL_COLUMNS.filter((column) =>
    rows.some((row) => isMeaningfulSummaryValue(row.cells[column.key]))
  );

  const columns: RecordsTableColumn[] = [
    ...CORE_BEFORE_OPTIONAL,
    ...optional.filter((column) => column.key === "moodLabels"),
    ...CORE_AFTER_MOOD,
    ...optional.filter((column) => column.key !== "moodLabels"),
    ...CORE_TRAILING,
  ];

  return { columns, rows };
}
