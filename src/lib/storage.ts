import { SAMPLE_SELF_CARE, STORAGE_KEYS } from "./constants";
import { calculateSleepMinutes } from "./sleep";
import { getTodayString } from "./dates";
import type { DailyRecord, SelfCareItem } from "./types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAllRecords(): DailyRecord[] {
  return readJson<DailyRecord[]>(STORAGE_KEYS.records, []);
}

export function getRecordByDate(date: string): DailyRecord | null {
  return getAllRecords().find((r) => r.date === date) ?? null;
}

export function saveRecord(
  date: string,
  data: Omit<
    DailyRecord,
    "id" | "date" | "sleepMinutes" | "createdAt" | "updatedAt"
  > & { id?: string }
): DailyRecord {
  const now = new Date().toISOString();
  const sleepMinutes = calculateSleepMinutes(data.sleepStart, data.sleepEnd);
  const existing = getRecordByDate(date);

  const record: DailyRecord = {
    id: data.id ?? existing?.id ?? generateId(),
    date,
    moodScore: data.moodScore,
    moodLabels: data.moodLabels,
    sleepStart: data.sleepStart,
    sleepEnd: data.sleepEnd,
    sleepMinutes,
    medication: data.medication,
    warningLevel: data.warningLevel,
    warningTags: data.warningTags,
    warningNote: data.warningNote,
    selfCareIds: data.selfCareIds,
    selfCareMemo: data.selfCareMemo,
    note: data.note,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const records = getAllRecords().filter((r) => r.date !== date);
  records.push(record);
  writeJson(STORAGE_KEYS.records, records);
  return record;
}

export function deleteRecord(date: string): void {
  const records = getAllRecords().filter((r) => r.date !== date);
  writeJson(STORAGE_KEYS.records, records);
}

export function getAllSelfCareItems(): SelfCareItem[] {
  return readJson<SelfCareItem[]>(STORAGE_KEYS.selfCare, []);
}

export function initSelfCareIfEmpty(): SelfCareItem[] {
  const existing = getAllSelfCareItems();
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const items: SelfCareItem[] = SAMPLE_SELF_CARE.map((title) => ({
    id: generateId(),
    title,
    createdAt: now,
    updatedAt: now,
  }));
  writeJson(STORAGE_KEYS.selfCare, items);
  return items;
}

export function addSelfCareItem(title: string): SelfCareItem {
  const now = new Date().toISOString();
  const item: SelfCareItem = {
    id: generateId(),
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const items = [...getAllSelfCareItems(), item];
  writeJson(STORAGE_KEYS.selfCare, items);
  return item;
}

export function updateSelfCareItem(id: string, title: string): SelfCareItem | null {
  const items = getAllSelfCareItems();
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const updated: SelfCareItem = {
    ...items[index],
    title: title.trim(),
    updatedAt: new Date().toISOString(),
  };
  items[index] = updated;
  writeJson(STORAGE_KEYS.selfCare, items);
  return updated;
}

export function deleteSelfCareItem(id: string): void {
  const items = getAllSelfCareItems().filter((i) => i.id !== id);
  writeJson(STORAGE_KEYS.selfCare, items);

  const records = getAllRecords().map((r) => ({
    ...r,
    selfCareIds: r.selfCareIds.filter((sid) => sid !== id),
  }));
  writeJson(STORAGE_KEYS.records, records);
}

export function createEmptyRecordForm(date: string): Omit<
  DailyRecord,
  "id" | "createdAt" | "updatedAt" | "sleepMinutes"
> {
  return {
    date,
    moodScore: null,
    moodLabels: [],
    sleepStart: null,
    sleepEnd: null,
    medication: null,
    warningLevel: null,
    warningTags: [],
    warningNote: "",
    selfCareIds: [],
    selfCareMemo: "",
    note: "",
  };
}

export function recordToFormState(
  record: DailyRecord | null,
  date: string
): Omit<DailyRecord, "id" | "createdAt" | "updatedAt" | "sleepMinutes"> {
  if (!record) return createEmptyRecordForm(date);
  return {
    date: record.date,
    moodScore: record.moodScore,
    moodLabels: [...record.moodLabels],
    sleepStart: record.sleepStart,
    sleepEnd: record.sleepEnd,
    medication: record.medication,
    warningLevel: record.warningLevel,
    warningTags: [...record.warningTags],
    warningNote: record.warningNote,
    selfCareIds: [...record.selfCareIds],
    selfCareMemo: record.selfCareMemo,
    note: record.note,
  };
}

export function isRecordEmpty(
  form: Omit<DailyRecord, "id" | "createdAt" | "updatedAt" | "sleepMinutes">
): boolean {
  return (
    form.moodScore === null &&
    form.moodLabels.length === 0 &&
    !form.sleepStart &&
    !form.sleepEnd &&
    form.medication === null &&
    form.warningLevel === null &&
    form.warningTags.length === 0 &&
    !form.warningNote &&
    form.selfCareIds.length === 0 &&
    !form.selfCareMemo &&
    !form.note
  );
}

/** 記録があるか（localStorage に保存済み） */
export function isRecordedDay(date: string): boolean {
  return getRecordByDate(date) !== null;
}

export { getTodayString };
