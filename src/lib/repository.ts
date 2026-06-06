import { SAMPLE_SELF_CARE, STORAGE_KEYS } from "./constants";
import { getTodayString } from "./dates";
import {
  EXPORT_VERSION,
  parseExportPayload,
  parseRecordsJson,
  parseSelfCareJson,
  STORAGE_SCHEMA_VERSION,
  type ExportPayload,
} from "./schemas";
import { calculateSleepMinutes } from "./sleep";
import { err, ok, type Result } from "./result";
import type { DailyRecord, SelfCareItem } from "./types";

const IMPORT_ROLLBACK_KEY = "yorucare_import_rollback";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
  const raw = localStorage.getItem(STORAGE_KEYS.records);
  if (!raw) return ok([]);
  try {
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
  const raw = localStorage.getItem(STORAGE_KEYS.selfCare);
  if (!raw) return ok([]);
  try {
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

export type StorageHealth = {
  records: Result<DailyRecord[]>;
  selfCare: Result<SelfCareItem[]>;
};

export const repository = {
  getStorageHealth(): StorageHealth {
    return {
      records: readRecords(),
      selfCare: readSelfCareItems(),
    };
  },

  getAllRecords(): Result<DailyRecord[]> {
    return readRecords();
  },

  getRecordByDate(date: string): Result<DailyRecord | null> {
    const records = readRecords();
    if (!records.ok) return records;
    return ok(records.value.find((r) => r.date === date) ?? null);
  },

  saveRecord(
    date: string,
    data: Omit<
      DailyRecord,
      "id" | "date" | "sleepMinutes" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Result<DailyRecord> {
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
      note: data.note,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const records = recordsResult.value.filter((r) => r.date !== date);
    records.push(record);
    const writeResult = writeRecords(records);
    if (!writeResult.ok) return writeResult;
    return ok(record);
  },

  deleteRecord(date: string): Result<void> {
    const recordsResult = readRecords();
    if (!recordsResult.ok) return recordsResult;
    return writeRecords(recordsResult.value.filter((r) => r.date !== date));
  },

  deleteAllRecords(): Result<void> {
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

  getAllSelfCareItems(): Result<SelfCareItem[]> {
    return readSelfCareItems();
  },

  ensureSampleSelfCare(): Result<SelfCareItem[]> {
    const existing = readSelfCareItems();
    if (!existing.ok) return existing;
    if (existing.value.length > 0) return existing;

    const now = new Date().toISOString();
    const items: SelfCareItem[] = SAMPLE_SELF_CARE.map((title) => ({
      id: generateId(),
      title,
      createdAt: now,
      updatedAt: now,
    }));
    const writeResult = writeSelfCareItems(items);
    if (!writeResult.ok) return writeResult;
    return ok(items);
  },

  addSelfCareItem(title: string): Result<SelfCareItem> {
    const itemsResult = readSelfCareItems();
    if (!itemsResult.ok) return itemsResult;

    const now = new Date().toISOString();
    const item: SelfCareItem = {
      id: generateId(),
      title: title.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const writeResult = writeSelfCareItems([...itemsResult.value, item]);
    if (!writeResult.ok) return writeResult;
    return ok(item);
  },

  updateSelfCareItem(id: string, title: string): Result<SelfCareItem> {
    const itemsResult = readSelfCareItems();
    if (!itemsResult.ok) return itemsResult;

    const index = itemsResult.value.findIndex((i) => i.id === id);
    if (index === -1) {
      return err({
        code: "VALIDATION_FAILED",
        message: "項目が見つかりませんでした。",
      });
    }

    const updated: SelfCareItem = {
      ...itemsResult.value[index],
      title: title.trim(),
      updatedAt: new Date().toISOString(),
    };
    const items = [...itemsResult.value];
    items[index] = updated;
    const writeResult = writeSelfCareItems(items);
    if (!writeResult.ok) return writeResult;
    return ok(updated);
  },

  deleteSelfCareItem(id: string): Result<void> {
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

  buildExportPayload(): Result<ExportPayload> {
    const records = readRecords();
    if (!records.ok) return records;
    const selfCare = readSelfCareItems();
    if (!selfCare.ok) return selfCare;

    return ok({
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      records: records.value,
      selfCareItems: selfCare.value,
    });
  },

  createImportRollback(): Result<void> {
    const payload = repository.buildExportPayload();
    if (!payload.ok) return payload;
    return writeRaw(IMPORT_ROLLBACK_KEY, JSON.stringify(payload.value));
  },

  restoreImportRollback(): Result<void> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    const raw = localStorage.getItem(IMPORT_ROLLBACK_KEY);
    if (!raw) {
      return err({
        code: "IMPORT_INVALID",
        message: "復元用のバックアップが見つかりませんでした。",
      });
    }
    try {
      const parsed = parseExportPayload(JSON.parse(raw));
      if (!parsed.ok) {
        return err({
          code: "IMPORT_INVALID",
          message: "復元用のバックアップが壊れています。",
        });
      }
      return repository.applyImport(parsed.data);
    } catch {
      return err({
        code: "IMPORT_INVALID",
        message: "復元用のバックアップを読み込めませんでした。",
      });
    }
  },

  applyImport(payload: ExportPayload): Result<void> {
    const recordsWrite = writeRecords(payload.records);
    if (!recordsWrite.ok) return recordsWrite;
    return writeSelfCareItems(payload.selfCareItems);
  },

  importBackup(jsonText: string): Result<{ recordCount: number; selfCareCount: number }> {
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

    const rollback = repository.createImportRollback();
    if (!rollback.ok) return rollback;

    const applied = repository.applyImport(parsed.data);
    if (!applied.ok) {
      repository.restoreImportRollback();
      return applied;
    }

    return ok({
      recordCount: parsed.data.records.length,
      selfCareCount: parsed.data.selfCareItems.length,
    });
  },
};

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

export function isRecordedDay(date: string): boolean {
  const result = repository.getRecordByDate(date);
  if (!result.ok) return false;
  return result.value !== null;
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
    note: record.note,
  });
}

export { getTodayString };
