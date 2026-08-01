import { trackEvent } from "./analytics";
import { recordBackupDone } from "./backup-reminder";
import { repository } from "./repository";
import type { Result } from "./result";
import type { ExportPayload } from "./schemas";

export type { ExportPayload as YorucareExport } from "./schemas";
export { EXPORT_VERSION } from "./schemas";

export function buildExportPayload(): Promise<Result<ExportPayload>> {
  return repository.buildExportPayload();
}

export async function downloadBackup(): Promise<Result<void>> {
  if (typeof window === "undefined") {
    return { ok: false, error: { code: "BROWSER_ONLY" } };
  }

  const payload = await repository.buildExportPayload();
  if (!payload.ok) return payload;

  const json = JSON.stringify(payload.value, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `yorucare-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  recordBackupDone();
  trackEvent("backup_exported");
  return { ok: true, value: undefined };
}

export async function importBackup(
  jsonText: string
): Promise<Result<{ recordCount: number; selfCareCount: number }>> {
  const result = await repository.importBackup(jsonText);
  if (result.ok) {
    // 取り込んだ元ファイルが手元にある＝バックアップ済みとみなす
    recordBackupDone();
    trackEvent("backup_imported", {
      recordCount: result.value.recordCount,
      selfCareCount: result.value.selfCareCount,
    });
  }
  return result;
}
