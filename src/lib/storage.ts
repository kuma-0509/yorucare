/**
 * @deprecated 直接の localStorage 操作は repository 経由に統一。
 * 既存 import 互換のための薄いラッパー。
 */
import { backupAfterSave } from "./cloud-sync";
import { repository } from "./repository";
import type { Result } from "./result";
import type { DailyRecord, NotToDoItem, SelfCareItem } from "./types";

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

export async function saveRecord(
  date: string,
  data: Omit<
    DailyRecord,
    "id" | "date" | "sleepMinutes" | "createdAt" | "updatedAt"
  > & { id?: string }
): Promise<Result<DailyRecord>> {
  const result = await repository.saveRecord(date, data);
  return withBackup(result);
}

/**
 * 端末への変更が終わってから預け直す。結果は待たないので、端末への保存は
 * これまでどおりの速さで完了する。
 *
 * **預けるのは記録全体のまるごと1件**なので、記録だけでなく「できること」・
 * 「やらないこと」・復職日・削除も、変えたら預け直す必要がある。ここを1つでも
 * 抜かすと、消したはずのものがクラウドに残り、復元したときに戻ってきてしまう。
 */
function withBackup<T>(result: Result<T>): Result<T> {
  if (result.ok) backupAfterSave();
  return result;
}

export async function deleteRecord(date: string): Promise<Result<void>> {
  return withBackup(await repository.deleteRecord(date));
}

export async function deleteAllRecords(): Promise<Result<void>> {
  return withBackup(await repository.deleteAllRecords());
}

export function getAllSelfCareItems(): Promise<Result<SelfCareItem[]>> {
  return repository.getAllSelfCareItems();
}

export function initSelfCareIfEmpty(): Promise<Result<SelfCareItem[]>> {
  return repository.ensureSampleSelfCare();
}

export async function addSelfCareItem(
  title: string
): Promise<Result<SelfCareItem>> {
  return withBackup(await repository.addSelfCareItem(title));
}

export async function updateSelfCareItem(
  id: string,
  title: string
): Promise<Result<SelfCareItem>> {
  return withBackup(await repository.updateSelfCareItem(id, title));
}

export async function deleteSelfCareItem(id: string): Promise<Result<void>> {
  return withBackup(await repository.deleteSelfCareItem(id));
}

export function getAllNotToDoItems(): Promise<Result<NotToDoItem[]>> {
  return repository.getAllNotToDoItems();
}

export async function addNotToDoItem(
  title: string
): Promise<Result<NotToDoItem>> {
  return withBackup(await repository.addNotToDoItem(title));
}

export async function updateNotToDoItem(
  id: string,
  title: string
): Promise<Result<NotToDoItem>> {
  return withBackup(await repository.updateNotToDoItem(id, title));
}

export async function deleteNotToDoItem(id: string): Promise<Result<void>> {
  return withBackup(await repository.deleteNotToDoItem(id));
}

export function getReturnDate(): Promise<Result<string | null>> {
  return repository.getReturnDate();
}

export async function saveReturnDate(
  date: string | null
): Promise<Result<void>> {
  return withBackup(await repository.saveReturnDate(date));
}
