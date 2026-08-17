import { err, ok, type Result } from "./result";
import {
  applyReplacement,
  buildDocumentTitle,
  checkDocument,
  describeRejection,
} from "./medication-documents";
import type { MedicationDocument } from "./types";

/**
 * お薬の書類（PDF）の保存層。
 *
 * 記録や設定と違って中身がファイルなので、localStorage ではなく IndexedDB に置く。
 * localStorage は目安5MBを記録・できること・お薬メモと分け合っており、
 * そこへ書類を入れると、1件で容量を使い切って記録の保存が止まりうる。
 *
 * 書類は端末の中だけに置く。書き出しファイルにも、集計にも、共有の経路にも載せない。
 */

const DB_NAME = "yorucare";
const DB_VERSION = 1;
const STORE_NAME = "medicationDocuments";

/**
 * 保存する形。見出しと中身を同じ行に持つ。
 *
 * 中身は Blob ではなく ArrayBuffer で持つ。
 * IndexedDB へ Blob を入れる実装は環境によって扱いが異なり、
 * iOS Safari では取り出せなくなる不具合が知られている。
 * ArrayBuffer はどの実装でもそのまま保存・復元できる。
 */
interface StoredDocument extends MedicationDocument {
  bytes: ArrayBuffer;
  mimeType: string;
}

export interface MedicationDocumentStore {
  list(): Promise<Result<MedicationDocument[]>>;
  /** 中身を読む。画面で開くときだけ呼ぶ */
  read(id: string): Promise<Result<Blob>>;
  add(input: {
    title: string;
    file: File;
    head: Uint8Array;
  }): Promise<Result<MedicationDocument>>;
  /** 既存の書類を差し替える。追加した日時は引き継ぐ */
  replace(
    id: string,
    input: { title: string; file: File; head: Uint8Array }
  ): Promise<Result<MedicationDocument>>;
  remove(id: string): Promise<Result<void>>;
  removeAll(): Promise<Result<void>>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = work(transaction.objectStore(STORE_NAME));
        transaction.oncomplete = () => db.close();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

/** 一覧へ中身を持ち出さないよう、見出しだけを取り出す */
function toMetadata(stored: StoredDocument): MedicationDocument {
  const { bytes: _bytes, mimeType: _mimeType, ...metadata } = stored;
  void _bytes;
  void _mimeType;
  return metadata;
}

const PDF_MIME_TYPE = "application/pdf";

const writeFailed = (message: string) =>
  err({ code: "WRITE_FAILED" as const, message });

export const indexedDbMedicationDocumentStore: MedicationDocumentStore = {
  async list(): Promise<Result<MedicationDocument[]>> {
    if (!isBrowser()) return ok([]);
    try {
      const stored = await runTransaction<StoredDocument[]>("readonly", (store) =>
        store.getAll() as IDBRequest<StoredDocument[]>
      );
      return ok(stored.map(toMetadata));
    } catch {
      return writeFailed("お薬の書類を読み込めませんでした。");
    }
  },

  async read(id: string): Promise<Result<Blob>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    try {
      const stored = await runTransaction<StoredDocument | undefined>(
        "readonly",
        (store) => store.get(id) as IDBRequest<StoredDocument | undefined>
      );
      if (!stored) {
        return err({
          code: "VALIDATION_FAILED",
          message: "書類が見つかりませんでした。",
        });
      }
      return ok(
        new Blob([stored.bytes], {
          type: stored.mimeType || PDF_MIME_TYPE,
        })
      );
    } catch {
      return writeFailed("お薬の書類を読み込めませんでした。");
    }
  },

  async add({ title, file, head }): Promise<Result<MedicationDocument>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });

    const existing = await indexedDbMedicationDocumentStore.list();
    if (!existing.ok) return existing;

    const check = checkDocument({ size: file.size, head }, existing.value.length);
    if (!check.ok) {
      return err({
        code: "VALIDATION_FAILED",
        message: describeRejection(check.reason),
      });
    }

    const now = new Date().toISOString();
    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      return writeFailed("ファイルを読み込めませんでした。");
    }

    const document: StoredDocument = {
      id: generateId(),
      title: buildDocumentTitle(title, file.name),
      fileName: file.name,
      byteSize: file.size,
      addedAt: now,
      updatedAt: now,
      bytes,
      mimeType: file.type || PDF_MIME_TYPE,
    };

    try {
      await runTransaction("readwrite", (store) => store.put(document));
      return ok(toMetadata(document));
    } catch {
      return writeFailed("お薬の書類を保存できませんでした。");
    }
  },

  async replace(id, { title, file, head }): Promise<Result<MedicationDocument>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });

    let stored: StoredDocument | undefined;
    try {
      stored = await runTransaction<StoredDocument | undefined>(
        "readonly",
        (store) => store.get(id) as IDBRequest<StoredDocument | undefined>
      );
    } catch {
      return writeFailed("お薬の書類を読み込めませんでした。");
    }

    if (!stored) {
      return err({
        code: "VALIDATION_FAILED",
        message: "差し替える書類が見つかりませんでした。",
      });
    }

    // 差し替えは件数を増やさないため、上限の判定では今の件数を数えない
    const check = checkDocument({ size: file.size, head }, 0);
    if (!check.ok) {
      return err({
        code: "VALIDATION_FAILED",
        message: describeRejection(check.reason),
      });
    }

    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      return writeFailed("ファイルを読み込めませんでした。");
    }

    const next: StoredDocument = {
      ...applyReplacement(
        toMetadata(stored),
        { title, fileName: file.name, byteSize: file.size },
        new Date().toISOString()
      ),
      bytes,
      mimeType: file.type || PDF_MIME_TYPE,
    };

    try {
      await runTransaction("readwrite", (store) => store.put(next));
      return ok(toMetadata(next));
    } catch {
      return writeFailed("お薬の書類を差し替えられませんでした。");
    }
  },

  async remove(id: string): Promise<Result<void>> {
    if (!isBrowser()) return err({ code: "BROWSER_ONLY" });
    try {
      await runTransaction("readwrite", (store) => store.delete(id));
      return ok(undefined);
    } catch {
      return writeFailed("お薬の書類を削除できませんでした。");
    }
  },

  /** 共有端末で使い終わったときの全削除から呼ぶ */
  async removeAll(): Promise<Result<void>> {
    if (!isBrowser()) return ok(undefined);
    try {
      await runTransaction("readwrite", (store) => store.clear());
      return ok(undefined);
    } catch {
      return writeFailed("お薬の書類を削除できませんでした。");
    }
  },
};

/** ファイルの先頭だけを読む。中身全体を画面へ載せずに種類を確かめるため */
export async function readFileHead(file: File, length = 8): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}
