export type StorageError =
  | { code: "CORRUPTED"; key: string }
  | { code: "QUOTA_EXCEEDED" }
  | { code: "VALIDATION_FAILED"; message: string }
  | { code: "BROWSER_ONLY" }
  | { code: "IMPORT_INVALID"; message: string }
  | { code: "WRITE_FAILED"; message: string };

export type Result<T, E = StorageError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function storageErrorMessage(error: StorageError): string {
  switch (error.code) {
    case "CORRUPTED":
      return "記録を読み込めませんでした。「これまで」タブからバックアップファイルで復元できるか試してください。";
    case "QUOTA_EXCEEDED":
      return "端末の保存容量がいっぱいのため、記録を保存できませんでした。古い記録の整理や、バックアップ後のデータ削除を検討してください。";
    case "VALIDATION_FAILED":
    case "IMPORT_INVALID":
      return error.message;
    case "BROWSER_ONLY":
      return "ブラウザでのみ実行できます。";
    case "WRITE_FAILED":
      return error.message;
    default:
      return "保存に失敗しました。もう一度お試しください。";
  }
}
