import { describe, expect, it } from "vitest";
import {
  applyReplacement,
  buildDocumentTitle,
  checkDocument,
  describeRejection,
  formatByteSize,
  hasPdfSignature,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_COUNT,
  sortDocuments,
} from "./medication-documents";
import type { MedicationDocument } from "./types";

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]); // %PDF-1
const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function doc(overrides: Partial<MedicationDocument> = {}): MedicationDocument {
  return {
    id: "d1",
    title: "処方の控え",
    fileName: "shohou.pdf",
    byteSize: 1024,
    addedAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("hasPdfSignature", () => {
  it("PDFの印で始まるファイルを通す", () => {
    expect(hasPdfSignature(PDF_HEAD)).toBe(true);
  });

  it("拡張子だけPDFの別形式を通さない", () => {
    expect(hasPdfSignature(PNG_HEAD)).toBe(false);
  });

  it("短すぎるファイルを通さない", () => {
    expect(hasPdfSignature(new Uint8Array([0x25, 0x50]))).toBe(false);
  });
});

describe("checkDocument", () => {
  it("PDFなら受け入れる", () => {
    expect(checkDocument({ size: 1024, head: PDF_HEAD }, 0)).toEqual({
      ok: true,
    });
  });

  it("PDF以外を受け入れない", () => {
    const result = checkDocument({ size: 1024, head: PNG_HEAD }, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe("NOT_PDF");
  });

  it("中身のないファイルを受け入れない", () => {
    const result = checkDocument({ size: 0, head: PDF_HEAD }, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe("EMPTY");
  });

  it("上限を超える大きさを受け入れない", () => {
    const result = checkDocument(
      { size: MAX_DOCUMENT_BYTES + 1, head: PDF_HEAD },
      0
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe("TOO_LARGE");
  });

  it("件数の上限に達していれば受け入れない", () => {
    const result = checkDocument(
      { size: 1024, head: PDF_HEAD },
      MAX_DOCUMENT_COUNT
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe("TOO_MANY");
  });

  it("差し替え（件数0で判定）は上限に達していても通る", () => {
    // 差し替えは件数を増やさないため、呼び出し側は 0 を渡す
    expect(checkDocument({ size: 1024, head: PDF_HEAD }, 0)).toEqual({
      ok: true,
    });
  });
});

describe("describeRejection", () => {
  it("理由ごとに画面へ出す文言を返す", () => {
    expect(describeRejection({ code: "NOT_PDF" })).toContain("PDF");
    expect(
      describeRejection({ code: "TOO_LARGE", limitBytes: MAX_DOCUMENT_BYTES })
    ).toContain("5MB");
    expect(
      describeRejection({ code: "TOO_MANY", limitCount: MAX_DOCUMENT_COUNT })
    ).toContain(String(MAX_DOCUMENT_COUNT));
  });

  it("責める表現や、書類の中身を推測する表現を使わない", () => {
    const messages = [
      describeRejection({ code: "NOT_PDF" }),
      describeRejection({ code: "EMPTY" }),
      describeRejection({ code: "TOO_LARGE", limitBytes: MAX_DOCUMENT_BYTES }),
      describeRejection({ code: "TOO_MANY", limitCount: MAX_DOCUMENT_COUNT }),
    ].join("");

    for (const word of ["失敗", "エラー", "不正", "無効", "禁止"]) {
      expect(messages).not.toContain(word);
    }
  });
});

describe("buildDocumentTitle", () => {
  it("本人がつけた名前を優先する", () => {
    expect(buildDocumentTitle("8月の処方", "abc.pdf")).toBe("8月の処方");
  });

  it("名前が空なら拡張子を除いたファイル名を使う", () => {
    expect(buildDocumentTitle("  ", "shohou_2026-08.pdf")).toBe(
      "shohou_2026-08"
    );
    expect(buildDocumentTitle("", "SHOHOU.PDF")).toBe("SHOHOU");
  });

  it("どちらも空なら、中身を推測させない固定の語にする", () => {
    expect(buildDocumentTitle("", "")).toBe("お薬の書類");
    expect(buildDocumentTitle("", ".pdf")).toBe("お薬の書類");
  });
});

describe("formatByteSize", () => {
  it("大きさに応じた単位で示す", () => {
    expect(formatByteSize(512)).toBe("512B");
    expect(formatByteSize(2048)).toBe("2KB");
    expect(formatByteSize(5 * 1024 * 1024)).toBe("5MB");
  });
});

describe("applyReplacement", () => {
  it("最初に追加した日時を引き継ぎ、差し替えた日時だけ新しくする", () => {
    const existing = doc();
    const next = applyReplacement(
      existing,
      { title: "9月の処方", fileName: "new.pdf", byteSize: 2048 },
      "2026-09-01T00:00:00.000Z"
    );

    expect(next.id).toBe(existing.id);
    expect(next.addedAt).toBe("2026-08-01T00:00:00.000Z");
    expect(next.updatedAt).toBe("2026-09-01T00:00:00.000Z");
    expect(next.title).toBe("9月の処方");
    expect(next.fileName).toBe("new.pdf");
    expect(next.byteSize).toBe(2048);
  });

  it("名前を空で差し替えると、新しいファイル名を名前にする", () => {
    const next = applyReplacement(
      doc(),
      { title: "", fileName: "shohou_09.pdf", byteSize: 10 },
      "2026-09-01T00:00:00.000Z"
    );

    expect(next.title).toBe("shohou_09");
  });
});

describe("sortDocuments", () => {
  it("差し替えた日時が新しい順に並べる", () => {
    const documents = [
      doc({ id: "a", updatedAt: "2026-08-01T00:00:00.000Z" }),
      doc({ id: "b", updatedAt: "2026-09-01T00:00:00.000Z" }),
      doc({ id: "c", updatedAt: "2026-07-01T00:00:00.000Z" }),
    ];

    expect(sortDocuments(documents).map((d) => d.id)).toEqual(["b", "a", "c"]);
  });

  it("元の配列を書き換えない", () => {
    const documents = [
      doc({ id: "a", updatedAt: "2026-08-01T00:00:00.000Z" }),
      doc({ id: "b", updatedAt: "2026-09-01T00:00:00.000Z" }),
    ];
    sortDocuments(documents);

    expect(documents.map((d) => d.id)).toEqual(["a", "b"]);
  });
});
