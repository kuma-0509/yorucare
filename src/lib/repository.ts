import { SAMPLE_SELF_CARE, STORAGE_KEYS } from "./constants";
import { getTodayString } from "./dates";
import {
  EXPORT_VERSION,
  MAX_MEDICATION_NOTE_LENGTH,
  parseExportPayload,
  parseMedicationNote,
  parseRecordsJson,
  parseReturnDate,
  parseSelfCareJson,
  STORAGE_SCHEMA_VERSION,
  type ExportPayload,
} from "./schemas";
import { calculateSleepMinutes } from "./sleep";
import { err, ok, type Result } from "./result";
import type { DailyRecord, SelfCareItem, StateLevel } from "./types";

const IMPORT_ROLLBACK_KEY = "yorucare_import_rollback";

/**
 * 登録簿の作成・更新で受け取る値。
 * 種別と状態は省略でき、省略時は「できること」「状態を問わず出す」になる。
 */
export type SelfCareItemInput = {
  title: string;
  kind?: SelfCareItem["kind"];
  stateLevels?: StateLevel[];
};

export type SaveRecordInput = Omit<
  DailyRecord,
  "id" | "date" | "sleepMinutes" | "createdAt" | "updatedAt"
> & { id?: string };

export type ImportSummary = {
  recordCount: number;
  selfCareCount: number;
};

export type StorageHealth = {
  records: DailyRecord[];
  selfCare: SelfCareItem[];
};

/**
 * 端末内保存と将来の API 実装が同じ呼び出し規約を持つための境界。
 * 実装方式にかかわらず、データ操作は例外を投げず Promise<Result<T>> で返す。
 */
export interface Repository {
  getStorageHealth(): Promise<Result<StorageHealth>>;
  getAllRecords(): Promise<Result<DailyRecord[]>>;
  getRecordByDate(date: string): Promise<Result<DailyRecord | null>>;
  saveRecord(date: string, data: SaveRecordInput): Promise<Result<DailyRecord>>;
  deleteRecord(date: string): Promise<Result<void>>;
  deleteAllRecords(): Promise<Result<void>>;
  getAllSelfCareItems(): Promise<Result<SelfCareItem[]>>;
  ensureSampleSelfCare(): Promise<Result<SelfCareItem[]>>;
  addSelfCareItem(input: string | SelfCareItemInput): Promise<Result<SelfCareItem>>;
  updateSelfCareItem(
    id: string,
    input: string | SelfCareItemInput
  ): Promise<Result<SelfCareItem>>;
  deleteSelfCareItem(id: string): Promise<Result<void>>;
  /** 積み重ねの起点として本人が設定した復職日。未設定なら null */
  getReturnDate(): Promise<Result<string | null>>;
  /** 復職日を設定する。null を渡すと未設定へ戻す */
  saveReturnDate(date: string | null): Promise<Result<void>>;
  /** 必要なときに自分で見せるためのお薬の覚え書き。未入力なら空文字 */
  getMedicationNote(): Promise<Result<string>>;
  /** お薬の覚え書きを保存する。空文字を渡すと消す */
  saveMedicationNote(note: string): Promise<Result<void>>;
  buildExportPayload(): Promise<Result<ExportPayload>>;
  importBackup(jsonText: string): Promise<Result<ImportSummary>>;
  runStorageMigrations(): Promise<Result<void>>;
}

interface LocalStorageRepository extends Repository {
  createImportRollback(): Promise<Result<void>>;
  restoreImportRollback(): Promise<Result<void>>;
  applyImport(payload: ExportPayload): Promise<Result<void>>;
  clearImportRollback(): Promise<Result<void>>;
  getStoredSchemaVersion(): Promise<Result<number | null>>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 文字列だけの旧い呼び出しと、種別つきの呼び出しの両方を受ける */
function normalizeSelfCareInput(
  input: string | SelfCareItemInput
): Required<SelfCareItemInput> {
  const value = typeof input === "string" ? { title: input } : input;
  return {
    title: value.title.trim(),
    kind: value.kind ?? "care",
    stateLevels: [...new Set(value.stateLevels ?? [])],
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function writeRaw(key: string, value: string): Result<void> {
  if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
  try {
    localStorage.setItem(key, value);
    return ok(undefined);
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      return err({ code: "QUOTA_EXCEEDED" });
    }
    return err({
      code: "WRITE_FAILED",
      message: "端末への保存に失敗しました。",
    });
  }
}

function readRecords(): Result<DailyRecord[]> {
  if (!isBrowser()) return ok([]);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.records);
    if (!raw) return ok([]);
    const parsed = JSON.parse(raw) as unknown;
    const result = parseRecordsJson(parsed);
    if (!result.success) {
      return err({ code: "CORRUPTED", key: STORAGE_KEYS.records });
    }
    return ok(result.data);
  } catch {
    return err({ code: "CORRUPTED", key: STORAGE_KEYS.records });
  }
}

function readSelfCareItems(): Result<SelfCareItem[]> {
  if (!isBrowser()) return ok([]);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.selfCare);
    if (!raw) return ok([]);
    const parsed = JSON.parse(raw) as unknown;
    const result = parseSelfCareJson(parsed);
    if (!result.success) {
      return err({ code: "CORRUPTED", key: STORAGE_KEYS.selfCare });
    }
    return ok(result.data);
  } catch {
    return err({ code: "CORRUPTED", key: STORAGE_KEYS.selfCare });
  }
}

function writeRecords(records: DailyRecord[]): Result<void> {
  const parsed = parseRecordsJson(records);
  if (!parsed.success) {
    return err({
      code: "VALIDATION_FAILED",
      message: "記録の形式が正しくないため保存できませんでした。",
    });
  }

  const result = writeRaw(STORAGE_KEYS.records, JSON.stringify(parsed.data));
  if (result.ok) {
    writeRaw(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION));
  }
  return result;
}

function writeSelfCareItems(items: SelfCareItem[]): Result<void> {
  const parsed = parseSelfCareJson(items);
  if (!parsed.success) {
    return err({
      code: "VALIDATION_FAILED",
      message: "できることの形式が正しくないため保存できませんでした。",
    });
  }

  const result = writeRaw(STORAGE_KEYS.selfCare, JSON.stringify(parsed.data));
  if (result.ok) {
    writeRaw(STORAGE_KEYS.schemaVersion, String(STORAGE_SCHEMA_VERSION));
  }
  return result;
}

const localStorageRepository: LocalStorageRepository = {
  async getStorageHealth(): Promise<Result<StorageHealth>> {
    const records = readRecords();
    if (!records.ok) return records;
    const selfCare = readSelfCareItems();
    if (!selfCare.ok) return selfCare;
    return ok({
      records: records.value,
      selfCare: selfCare.value,
    });
  },

  async getAllRecords(): Promise<Result<DailyRecord[]>> {
    return readRecords();
  },

  async getRecordByDate(
    date: string
  ): Promise<Result<DailyRecord | null>> {
    const records = readRecords();
    if (!records.ok) return records;
    return ok(records.value.find((r) => r.date === date) ?? null);
  },

  async saveRecord(
    date: string,
    data: SaveRecordInput
  ): Promise<Result<DailyRecord>> {
    const recordsResult = readRecords();
    if (!recordsResult.ok) return recordsResult;

    const now = new Date().toISOString();
    const sleepMinutes = calculateSleepMinutes(data.sleepStart, data.sleepEnd);
    const existing = recordsResult.value.find((r) => r.date === date);

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
      selfCareFeeling: data.selfCareFeeling,
      note: data.note,
      tomorrowGoal: data.tomorrowGoal,
      goalReviewStatus: data.goalReviewStatus,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const records = recordsResult.value.filter((r) => r.date !== date);
    records.push(record);
    const writeResult = writeRecords(records);
    if (!writeResult.ok) return writeResult;
    return ok(record);
  },

  async deleteRecord(date: string): Promise<Result<void>> {
    const recordsResult = readRecords();
    if (!recordsResult.ok) return recordsResult;
    return writeRecords(recordsResult.value.filter((r) => r.date !== date));
  },

  async deleteAllRecords(): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    try {
      localStorage.removeItem(STORAGE_KEYS.records);
      return ok(undefined);
    } catch {
      return err({
        code: "WRITE_FAILED",
        message: "記録の削除に失敗しました。",
      });
    }
  },

  async getAllSelfCareItems(): Promise<Result<SelfCareItem[]>> {
    return readSelfCareItems();
  },

  async ensureSampleSelfCare(): Promise<Result<SelfCareItem[]>> {
    const existing = readSelfCareItems();
    if (!existing.ok) return existing;
    if (existing.value.length > 0) return existing;

    const now = new Date().toISOString();
    const items: SelfCareItem[] = SAMPLE_SELF_CARE.map((title) => ({
      id: generateId(),
      title,
      kind: "care",
      stateLevels: [],
      createdAt: now,
      updatedAt: now,
    }));
    const writeResult = writeSelfCareItems(items);
    if (!writeResult.ok) return writeResult;
    return ok(items);
  },

  async addSelfCareItem(
    input: string | SelfCareItemInput
  ): Promise<Result<SelfCareItem>> {
    const itemsResult = readSelfCareItems();
    if (!itemsResult.ok) return itemsResult;

    const { title, kind, stateLevels } = normalizeSelfCareInput(input);
    const now = new Date().toISOString();
    const item: SelfCareItem = {
      id: generateId(),
      title,
      kind,
      stateLevels,
      createdAt: now,
      updatedAt: now,
    };
    const writeResult = writeSelfCareItems([...itemsResult.value, item]);
    if (!writeResult.ok) return writeResult;
    return ok(item);
  },

  async updateSelfCareItem(
    id: string,
    input: string | SelfCareItemInput
  ): Promise<Result<SelfCareItem>> {
    const itemsResult = readSelfCareItems();
    if (!itemsResult.ok) return itemsResult;

    const index = itemsResult.value.findIndex((i) => i.id === id);
    if (index === -1) {
      return err({
        code: "VALIDATION_FAILED",
        message: "項目が見つかりませんでした。",
      });
    }

    const existing = itemsResult.value[index];
    const { title, kind, stateLevels } = normalizeSelfCareInput(
      typeof input === "string"
        ? // 文字列だけの呼び出しでは、種別と状態を今の設定のまま残す
          { title: input, kind: existing.kind, stateLevels: existing.stateLevels }
        : input
    );

    const updated: SelfCareItem = {
      ...existing,
      title,
      kind,
      stateLevels,
      updatedAt: new Date().toISOString(),
    };
    const items = [...itemsResult.value];
    items[index] = updated;
    const writeResult = writeSelfCareItems(items);
    if (!writeResult.ok) return writeResult;
    return ok(updated);
  },

  async deleteSelfCareItem(id: string): Promise<Result<void>> {
    const itemsResult = readSelfCareItems();
    if (!itemsResult.ok) return itemsResult;

    const writeItems = writeSelfCareItems(
      itemsResult.value.filter((i) => i.id !== id)
    );
    if (!writeItems.ok) return writeItems;

    const recordsResult = readRecords();
    if (!recordsResult.ok) return recordsResult;

    return writeRecords(
      recordsResult.value.map((r) => ({
        ...r,
        selfCareIds: r.selfCareIds.filter((sid) => sid !== id),
      }))
    );
  },

  async getReturnDate(): Promise<Result<string | null>> {
    if (!isBrowser()) return ok(null);
    try {
      return ok(parseReturnDate(localStorage.getItem(STORAGE_KEYS.returnDate)));
    } catch {
      return ok(null);
    }
  },

  async saveReturnDate(date: string | null): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });

    if (date === null) {
      try {
        localStorage.removeItem(STORAGE_KEYS.returnDate);
        return ok(undefined);
      } catch {
        return err({
          code: "WRITE_FAILED",
          message: "復職日の削除に失敗しました。",
        });
      }
    }

    if (parseReturnDate(date) === null) {
      return err({
        code: "VALIDATION_FAILED",
        message: "日付の形式が正しくありません。",
      });
    }
    return writeRaw(STORAGE_KEYS.returnDate, date);
  },

  async getMedicationNote(): Promise<Result<string>> {
    if (!isBrowser()) return ok("");
    try {
      return ok(
        parseMedicationNote(localStorage.getItem(STORAGE_KEYS.medicationNote))
      );
    } catch {
      return ok("");
    }
  },

  async saveMedicationNote(note: string): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });

    if (note.length > MAX_MEDICATION_NOTE_LENGTH) {
      return err({
        code: "VALIDATION_FAILED",
        message: `${MAX_MEDICATION_NOTE_LENGTH}文字以内で入力してください。`,
      });
    }

    if (note.trim().length === 0) {
      try {
        localStorage.removeItem(STORAGE_KEYS.medicationNote);
        return ok(undefined);
      } catch {
        return err({
          code: "WRITE_FAILED",
          message: "お薬メモの削除に失敗しました。",
        });
      }
    }

    return writeRaw(STORAGE_KEYS.medicationNote, note);
  },

  async buildExportPayload(): Promise<Result<ExportPayload>> {
    const records = readRecords();
    if (!records.ok) return records;
    const selfCare = readSelfCareItems();
    if (!selfCare.ok) return selfCare;
    const returnDate = await localStorageRepository.getReturnDate();
    if (!returnDate.ok) return returnDate;
    const medicationNote = await localStorageRepository.getMedicationNote();
    if (!medicationNote.ok) return medicationNote;

    return ok({
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      returnDate: returnDate.value,
      medicationNote: medicationNote.value,
      records: records.value,
      selfCareItems: selfCare.value,
    });
  },

  async createImportRollback(): Promise<Result<void>> {
    const payload = await localStorageRepository.buildExportPayload();
    if (!payload.ok) return payload;
    return writeRaw(IMPORT_ROLLBACK_KEY, JSON.stringify(payload.value));
  },

  async restoreImportRollback(): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    try {
      const raw = localStorage.getItem(IMPORT_ROLLBACK_KEY);
      if (!raw) {
        return err({
          code: "IMPORT_INVALID",
          message: "復元用のバックアップが見つかりませんでした。",
        });
      }
      const parsed = parseExportPayload(JSON.parse(raw));
      if (!parsed.ok) {
        return err({
          code: "IMPORT_INVALID",
          message: "復元用のバックアップが壊れています。",
        });
      }
      return await localStorageRepository.applyImport(parsed.data);
    } catch {
      return err({
        code: "IMPORT_INVALID",
        message: "復元用のバックアップを読み込めませんでした。",
      });
    }
  },

  async applyImport(payload: ExportPayload): Promise<Result<void>> {
    const recordsWrite = writeRecords(payload.records);
    if (!recordsWrite.ok) return recordsWrite;
    const selfCareWrite = writeSelfCareItems(payload.selfCareItems);
    if (!selfCareWrite.ok) return selfCareWrite;
    // 復職日を持たない書き出しからの取り込みでは、既定値の null で未設定へ戻す。
    // 端末に残った前の設定が、取り込んだ記録の起点として残らないようにする。
    const returnDateWrite = await localStorageRepository.saveReturnDate(
      payload.returnDate
    );
    if (!returnDateWrite.ok) return returnDateWrite;
    // お薬メモも同じ理由で、取り込んだファイルの内容へ置き換える
    return localStorageRepository.saveMedicationNote(payload.medicationNote);
  },

  async clearImportRollback(): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    try {
      localStorage.removeItem(IMPORT_ROLLBACK_KEY);
      return ok(undefined);
    } catch {
      return err({
        code: "WRITE_FAILED",
        message: "退避データの削除に失敗しました。",
      });
    }
  },

  async importBackup(jsonText: string): Promise<Result<ImportSummary>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });

    let raw: unknown;
    try {
      raw = JSON.parse(jsonText);
    } catch {
      return err({
        code: "IMPORT_INVALID",
        message: "ファイルを読み込めませんでした。",
      });
    }

    const parsed = parseExportPayload(raw);
    if (!parsed.ok) {
      return err({ code: "IMPORT_INVALID", message: parsed.message });
    }

    const rollback = await localStorageRepository.createImportRollback();
    if (!rollback.ok) return rollback;

    const applied = await localStorageRepository.applyImport(parsed.data);
    if (!applied.ok) {
      await localStorageRepository.restoreImportRollback();
      // 復元後も退避データが残ると容量を二重に消費するため掃除する
      await localStorageRepository.clearImportRollback();
      return applied;
    }

    // 取り込み成功後は退避データを残さない（容量の二重消費を防ぐ）
    await localStorageRepository.clearImportRollback();

    return ok({
      recordCount: parsed.data.records.length,
      selfCareCount: parsed.data.selfCareItems.length,
    });
  },

  /** 保存済みデータのスキーマ版を読む（未設定なら null） */
  async getStoredSchemaVersion(): Promise<Result<number | null>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.schemaVersion);
      if (!raw) return ok(null);
      const parsed = Number(raw);
      return ok(Number.isFinite(parsed) ? parsed : null);
    } catch {
      return err({
        code: "WRITE_FAILED",
        message: "保存データのバージョン確認に失敗しました。",
      });
    }
  },

  /**
   * 起動時のスキーマ移行ランナー。
   * 保存版が現行版より古い（または未設定だがデータがある）場合、
   * 読み込み（Zod transform による正規化）→書き戻しで保存形を最新化し、版を更新する。
   * 破損時は何もしない（StorageHealthBanner が警告を表示する）。
   */
  async runStorageMigrations(): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });

    const storedVersionResult =
      await localStorageRepository.getStoredSchemaVersion();
    if (!storedVersionResult.ok) return storedVersionResult;
    const storedVersion = storedVersionResult.value;
    if (storedVersion === STORAGE_SCHEMA_VERSION) return ok(undefined);

    const records = readRecords();
    const selfCare = readSelfCareItems();
    if (!records.ok) return records;
    if (!selfCare.ok) return selfCare;

    const hasData = records.value.length > 0 || selfCare.value.length > 0;
    if (storedVersion === null && !hasData) {
      // 新規ユーザー。版だけ記録しておく。
      return writeRaw(
        STORAGE_KEYS.schemaVersion,
        String(STORAGE_SCHEMA_VERSION)
      );
    }

    // 正規化済みの値を書き戻し、保存形を最新スキーマに揃える。
    const recordsWrite = writeRecords(records.value);
    if (!recordsWrite.ok) return recordsWrite;
    return writeSelfCareItems(selfCare.value);
  },
};

export const repository: Repository = localStorageRepository;

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
    selfCareFeeling: null,
    note: "",
    tomorrowGoal: "",
    goalReviewStatus: null,
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
    selfCareFeeling: record.selfCareFeeling,
    note: record.note,
    tomorrowGoal: record.tomorrowGoal,
    goalReviewStatus: record.goalReviewStatus,
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
    form.selfCareFeeling === null &&
    !form.note &&
    form.tomorrowGoal.trim().length === 0 &&
    form.goalReviewStatus === null
  );
}

export async function isRecordedDay(date: string): Promise<Result<boolean>> {
  const result = await repository.getRecordByDate(date);
  if (!result.ok) return result;
  return ok(result.value !== null);
}

export function isDailyRecordEmpty(record: DailyRecord): boolean {
  return isRecordEmpty({
    date: record.date,
    moodScore: record.moodScore,
    moodLabels: record.moodLabels,
    sleepStart: record.sleepStart,
    sleepEnd: record.sleepEnd,
    medication: record.medication,
    warningLevel: record.warningLevel,
    warningTags: record.warningTags,
    warningNote: record.warningNote,
    selfCareIds: record.selfCareIds,
    selfCareMemo: record.selfCareMemo,
    selfCareFeeling: record.selfCareFeeling,
    note: record.note,
    tomorrowGoal: record.tomorrowGoal,
    goalReviewStatus: record.goalReviewStatus,
  });
}

export { getTodayString };
