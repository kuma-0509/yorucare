import { STORAGE_KEYS } from "./constants";
import { getAllRecords, getAllSelfCareItems } from "./storage";
import type { DailyRecord, SelfCareItem } from "./types";

const EXPORT_VERSION = 1;

export type YorucareExport = {
  version: number;
  exportedAt: string;
  records: DailyRecord[];
  selfCareItems: SelfCareItem[];
};

export function buildExportPayload(): YorucareExport {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    records: getAllRecords(),
    selfCareItems: getAllSelfCareItems(),
  };
}

export function downloadBackup(): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(buildExportPayload(), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yorucare-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(jsonText: string): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "ブラウザでのみ実行できます" };
  }
  try {
    const data = JSON.parse(jsonText) as Partial<YorucareExport>;
    if (!Array.isArray(data.records) || !Array.isArray(data.selfCareItems)) {
      return { ok: false, error: "ファイルの形式が正しくありません" };
    }
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(data.records));
    localStorage.setItem(STORAGE_KEYS.selfCare, JSON.stringify(data.selfCareItems));
    return { ok: true };
  } catch {
    return { ok: false, error: "ファイルを読み込めませんでした" };
  }
}
