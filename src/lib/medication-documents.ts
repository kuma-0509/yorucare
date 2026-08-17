import { MAX_SELF_CARE_TITLE_LENGTH } from "./schemas";
import type { MedicationDocument } from "./types";

/**
 * お薬の書類（PDF）の受け入れ判定と見出しの組み立て。
 *
 * ここは保存先を知らない純粋な判定だけを持つ。
 * 実際の保存は `medication-document-store.ts` が受け持つ。
 *
 * 書類は端末内にだけ置き、共有・送信の経路には載せない。
 * 処方の控えやお薬手帳の写しには、氏名や医療機関名が入りうるため。
 */

/** 1件あたりの上限。一般的な処方の控えは数百KBに収まる */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

/** 保存できる件数の上限。端末の容量を使い切らないために区切る */
export const MAX_DOCUMENT_COUNT = 20;

export const MAX_DOCUMENT_TITLE_LENGTH = MAX_SELF_CARE_TITLE_LENGTH;

/** PDFの先頭にある印。拡張子やMIME型の自己申告だけを信じない */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF

export type DocumentRejection =
  | { code: "NOT_PDF" }
  | { code: "TOO_LARGE"; limitBytes: number }
  | { code: "EMPTY" }
  | { code: "TOO_MANY"; limitCount: number };

export type DocumentCheck =
  | { ok: true }
  | { ok: false; reason: DocumentRejection };

/** 画面に出す文言。判定の理由をそのまま日本語にする */
export function describeRejection(reason: DocumentRejection): string {
  switch (reason.code) {
    case "NOT_PDF":
      return "PDFのファイルだけ追加できます。";
    case "TOO_LARGE":
      return `${formatByteSize(reason.limitBytes)}までのファイルを追加できます。`;
    case "EMPTY":
      return "中身のないファイルは追加できません。";
    case "TOO_MANY":
      return `保存できるのは${reason.limitCount}件までです。いらない書類を消すか、どれかを差し替えてください。`;
  }
}

/** ファイルの先頭が PDF の印で始まるか */
export function hasPdfSignature(head: Uint8Array): boolean {
  if (head.length < PDF_SIGNATURE.length) return false;
  return PDF_SIGNATURE.every((byte, index) => head[index] === byte);
}

/**
 * 追加してよいファイルかを判定する。
 *
 * `currentCount` には差し替え対象を数えない。差し替えは件数を増やさないため。
 */
export function checkDocument(
  file: { size: number; head: Uint8Array },
  currentCount: number
): DocumentCheck {
  if (currentCount >= MAX_DOCUMENT_COUNT) {
    return {
      ok: false,
      reason: { code: "TOO_MANY", limitCount: MAX_DOCUMENT_COUNT },
    };
  }
  if (file.size === 0) return { ok: false, reason: { code: "EMPTY" } };
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      reason: { code: "TOO_LARGE", limitBytes: MAX_DOCUMENT_BYTES },
    };
  }
  if (!hasPdfSignature(file.head)) {
    return { ok: false, reason: { code: "NOT_PDF" } };
  }
  return { ok: true };
}

/**
 * 一覧に出す名前。
 * 本人が名前を書いていればそれを使い、書いていなければファイル名で代える。
 * どちらも空なら、内容を推測させない固定の語にする。
 */
export function buildDocumentTitle(
  inputTitle: string,
  fileName: string
): string {
  const title = inputTitle.trim();
  if (title.length > 0) return title.slice(0, MAX_DOCUMENT_TITLE_LENGTH);

  const name = fileName.trim().replace(/\.pdf$/i, "");
  if (name.length > 0) return name.slice(0, MAX_DOCUMENT_TITLE_LENGTH);

  return "お薬の書類";
}

/** 画面に出すファイルの大きさ。小数1桁までにとどめる */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

/**
 * 差し替えたときの見出し。
 *
 * 最初に追加した日時は引き継ぎ、差し替えた日時だけを新しくする。
 * いつから持っている書類かを見失わないため。
 */
export function applyReplacement(
  existing: MedicationDocument,
  next: { title: string; fileName: string; byteSize: number },
  now: string
): MedicationDocument {
  return {
    ...existing,
    title: buildDocumentTitle(next.title, next.fileName),
    fileName: next.fileName,
    byteSize: next.byteSize,
    updatedAt: now,
  };
}

/** 新しい順に並べる。同じ日時なら追加した順を保つ */
export function sortDocuments(
  documents: MedicationDocument[]
): MedicationDocument[] {
  return [...documents].sort((a, b) =>
    a.updatedAt === b.updatedAt ? 0 : a.updatedAt < b.updatedAt ? 1 : -1
  );
}
