/**
 * @deprecated 直接の localStorage 操作は repository 経由に統一。
 * 既存 import 互換のための薄いラッパー。
 */
import { repository } from "./repository";
import type { Result } from "./result";
import type { DailyRecord, SelfCareItem } from "./types";

export {
  createEmptyRecordForm,
  getTodayString,
  isDailyRecordEmpty,
  isRecordEmpty,
  isRecordedDay,
  recordToFormState,
  repository,
} from "./repository";

function unwrap<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export function getAllRecords(): DailyRecord[] {
  return unwrap(repository.getAllRecords(), []);
}

export function getRecordByDate(date: string): DailyRecord | null {
  return unwrap(repository.getRecordByDate(date), null);
}

export function saveRecord(
  date: string,
  data: Omit<
    DailyRecord,
    "id" | "date" | "sleepMinutes" | "createdAt" | "updatedAt"
  > & { id?: string }
): Result<DailyRecord> {
  return repository.saveRecord(date, data);
}

export function deleteRecord(date: string): Result<void> {
  return repository.deleteRecord(date);
}

export function deleteAllRecords(): Result<void> {
  return repository.deleteAllRecords();
}

export function getAllSelfCareItems(): SelfCareItem[] {
  return unwrap(repository.getAllSelfCareItems(), []);
}

export function initSelfCareIfEmpty(): SelfCareItem[] {
  return unwrap(repository.ensureSampleSelfCare(), []);
}

export function addSelfCareItem(title: string): Result<SelfCareItem> {
  return repository.addSelfCareItem(title);
}

export function updateSelfCareItem(
  id: string,
  title: string
): Result<SelfCareItem> {
  return repository.updateSelfCareItem(id, title);
}

export function deleteSelfCareItem(id: string): Result<void> {
  return repository.deleteSelfCareItem(id);
}
