// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { indexedDbMedicationDocumentStore as store } from "./medication-document-store";
import { MAX_DOCUMENT_BYTES } from "./medication-documents";

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function pdfFile(name: string, size = 1024): File {
  const file = new File([new Uint8Array(size)], name, {
    type: "application/pdf",
  });
  return file;
}

/** 大きさだけを差し替えたファイル。上限の判定を実データなしで確かめる */
function hugeFile(name: string): File {
  const file = pdfFile(name, 8);
  Object.defineProperty(file, "size", { value: MAX_DOCUMENT_BYTES + 1 });
  return file;
}

async function clearAll() {
  await store.removeAll();
}

beforeEach(clearAll);
afterEach(clearAll);

describe("お薬の書類の保存", () => {
  it("最初は空", async () => {
    await expect(store.list()).resolves.toEqual({ ok: true, value: [] });
  });

  it("PDFを追加して一覧に出る", async () => {
    const added = await store.add({
      title: "8月の処方",
      file: pdfFile("shohou.pdf"),
      head: PDF_HEAD,
    });

    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.title).toBe("8月の処方");
    expect(added.value.fileName).toBe("shohou.pdf");

    const list = await store.list();
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.value).toHaveLength(1);
  });

  it("見出しに中身のファイルを含めない", async () => {
    const added = await store.add({
      title: "",
      file: pdfFile("a.pdf"),
      head: PDF_HEAD,
    });

    expect(added.ok).toBe(true);
    if (added.ok) {
      // 一覧の表示にファイル本体を持ち出さない
      expect("bytes" in added.value).toBe(false);
      expect("mimeType" in added.value).toBe(false);
    }
  });

  it("一覧にもファイル本体を持ち出さない", async () => {
    await store.add({ title: "", file: pdfFile("a.pdf"), head: PDF_HEAD });

    const list = await store.list();
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect("bytes" in list.value[0]).toBe(false);
    }
  });

  it("PDF以外を受け入れない", async () => {
    const added = await store.add({
      title: "",
      file: pdfFile("fake.pdf"),
      head: PNG_HEAD,
    });

    expect(added.ok).toBe(false);
    const list = await store.list();
    if (list.ok) expect(list.value).toHaveLength(0);
  });

  it("上限を超える大きさを受け入れない", async () => {
    const added = await store.add({
      title: "",
      file: hugeFile("big.pdf"),
      head: PDF_HEAD,
    });

    expect(added.ok).toBe(false);
  });

  it("追加した中身を読み出せる", async () => {
    const added = await store.add({
      title: "",
      file: pdfFile("a.pdf", 16),
      head: PDF_HEAD,
    });
    if (!added.ok) throw new Error("追加できなかった");

    const read = await store.read(added.value.id);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value.size).toBe(16);
  });

  it("ない書類を読もうとしてもエラーで止まらない", async () => {
    const read = await store.read("存在しないID");
    expect(read.ok).toBe(false);
  });
});

describe("2枚目以降の扱い", () => {
  it("新しく追加すると件数が増える", async () => {
    await store.add({ title: "1枚目", file: pdfFile("a.pdf"), head: PDF_HEAD });
    await store.add({ title: "2枚目", file: pdfFile("b.pdf"), head: PDF_HEAD });

    const list = await store.list();
    expect(list.ok).toBe(true);
    if (list.ok) expect(list.value).toHaveLength(2);
  });

  it("差し替えると件数が増えず、中身が入れ替わる", async () => {
    const first = await store.add({
      title: "8月の処方",
      file: pdfFile("aug.pdf", 16),
      head: PDF_HEAD,
    });
    if (!first.ok) throw new Error("追加できなかった");

    const replaced = await store.replace(first.value.id, {
      title: "9月の処方",
      file: pdfFile("sep.pdf", 32),
      head: PDF_HEAD,
    });

    expect(replaced.ok).toBe(true);
    if (replaced.ok) {
      expect(replaced.value.id).toBe(first.value.id);
      expect(replaced.value.title).toBe("9月の処方");
      expect(replaced.value.fileName).toBe("sep.pdf");
      // いつから持っている書類かを見失わないため、追加した日時は引き継ぐ
      expect(replaced.value.addedAt).toBe(first.value.addedAt);
    }

    const list = await store.list();
    if (list.ok) expect(list.value).toHaveLength(1);

    const read = await store.read(first.value.id);
    if (read.ok) expect(read.value.size).toBe(32);
  });

  it("差し替えでもPDF以外は受け入れず、前の書類を壊さない", async () => {
    const first = await store.add({
      title: "8月の処方",
      file: pdfFile("aug.pdf", 16),
      head: PDF_HEAD,
    });
    if (!first.ok) throw new Error("追加できなかった");

    const replaced = await store.replace(first.value.id, {
      title: "",
      file: pdfFile("fake.pdf"),
      head: PNG_HEAD,
    });

    expect(replaced.ok).toBe(false);
    const read = await store.read(first.value.id);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value.size).toBe(16);
  });

  it("ない書類を差し替えようとしても、新しく作らない", async () => {
    const replaced = await store.replace("存在しないID", {
      title: "",
      file: pdfFile("a.pdf"),
      head: PDF_HEAD,
    });

    expect(replaced.ok).toBe(false);
    const list = await store.list();
    if (list.ok) expect(list.value).toHaveLength(0);
  });
});

describe("削除", () => {
  it("1件だけ消せる", async () => {
    const first = await store.add({
      title: "1枚目",
      file: pdfFile("a.pdf"),
      head: PDF_HEAD,
    });
    await store.add({ title: "2枚目", file: pdfFile("b.pdf"), head: PDF_HEAD });
    if (!first.ok) throw new Error("追加できなかった");

    await store.remove(first.value.id);

    const list = await store.list();
    if (list.ok) {
      expect(list.value).toHaveLength(1);
      expect(list.value[0].title).toBe("2枚目");
    }
  });

  it("全削除で書類が残らない", async () => {
    await store.add({ title: "1枚目", file: pdfFile("a.pdf"), head: PDF_HEAD });
    await store.add({ title: "2枚目", file: pdfFile("b.pdf"), head: PDF_HEAD });

    await store.removeAll();

    const list = await store.list();
    if (list.ok) expect(list.value).toHaveLength(0);
  });
});
