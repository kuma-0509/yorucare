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

export function getAllRecords(): Promise<Result<DailyRecord[]>> {
  return repository.getAllRecords();
}

export function getRecordByDate(
  date: string
): Promise<Result<DailyRecord | null>> {
  return repository.getRecordByDate(date);
}

export function saveRecord(
  date: string,
  data: Omit<
    DailyRecord,
    "id" | "date" | "sleepMinutes" | "createdAt" | "updatedAt"
  > & { id?: string }
): Promise<Result<DailyRecord>> {
  return repository.saveRecord(date, data);
}

export function deleteRecord(date: string): Promise<Result<void>> {
  return repository.deleteRecord(date);
}

export function deleteAllRecords(): Promise<Result<void>> {
  return repository.deleteAllRecords();
}

export function getAllSelfCareItems(): Promise<Result<SelfCareItem[]>> {
  return repository.getAllSelfCareItems();
}

export function initSelfCareIfEmpty(): Promise<Result<SelfCareItem[]>> {
  return repository.ensureSampleSelfCare();
}

export function addSelfCareItem(
  title: string
): Promise<Result<SelfCareItem>> {
  return repository.addSelfCareItem(title);
}

export function updateSelfCareItem(
  id: string,
  title: string
): Promise<Result<SelfCareItem>> {
  return repository.updateSelfCareItem(id, title);
}

export function deleteSelfCareItem(id: string): Promise<Result<void>> {
  return repository.deleteSelfCareItem(id);
}
