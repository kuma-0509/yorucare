"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectionControl } from "@/components/shared/option-button";
import { COPY } from "@/lib/copy";
import {
  indexedDbMedicationDocumentStore as store,
  readFileHead,
} from "@/lib/medication-document-store";
import {
  formatByteSize,
  MAX_DOCUMENT_TITLE_LENGTH,
  sortDocuments,
} from "@/lib/medication-documents";
import { storageErrorMessage } from "@/lib/result";
import type { MedicationDocument } from "@/lib/types";

/** 選んだファイルと、その先頭バイト。判定と保存の両方で使う */
interface PendingFile {
  file: File;
  head: Uint8Array;
}

/** 新しく増やすか、どれと差し替えるか。`null` は新規追加 */
type Destination = { replaceId: string | null };

interface MedicationDocumentSectionProps {
  onLiveMessage?: (message: string) => void;
}

/**
 * お薬の書類（PDF）の一覧と追加。
 *
 * 2枚目以降を選んだときは、保存する前に「新しく追加する」か
 * 「どれを差し替えるか」を必ず本人に選ばせる。黙って上書きしない。
 *
 * 書類は端末内にだけ置き、共有・送信の経路には出さない。
 */
export function MedicationDocumentSection({
  onLiveMessage,
}: MedicationDocumentSectionProps) {
  const [documents, setDocuments] = useState<MedicationDocument[]>([]);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [destination, setDestination] = useState<Destination>({
    replaceId: null,
  });
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const result = await store.list();
    if (!result.ok) {
      setError(storageErrorMessage(result.error));
      return;
    }
    setDocuments(sortDocuments(result.value));
  };

  useEffect(() => {
    void load();
    // 初回だけ読む。以降は追加・差し替え・削除のあとに読み直す
  }, []);

  const resetSelection = () => {
    setPending(null);
    setTitle("");
    setDestination({ replaceId: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const head = await readFileHead(file);
    setPending({ file, head });
    setTitle("");
    setDestination({ replaceId: null });
  };

  const handleConfirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);

    const input = { title, file: pending.file, head: pending.head };
    const result =
      destination.replaceId === null
        ? await store.add(input)
        : await store.replace(destination.replaceId, input);

    setBusy(false);
    if (!result.ok) {
      setError(storageErrorMessage(result.error));
      return;
    }

    const message =
      destination.replaceId === null
        ? COPY.medicationDocument.added
        : COPY.medicationDocument.replaced;
    onLiveMessage?.(message);
    resetSelection();
    await load();
  };

  const handleRemove = async (id: string) => {
    if (busy) return;
    if (!window.confirm(COPY.medicationDocument.removeConfirm)) return;
    setBusy(true);
    const result = await store.remove(id);
    setBusy(false);
    if (!result.ok) {
      setError(storageErrorMessage(result.error));
      return;
    }
    onLiveMessage?.(COPY.medicationDocument.removed);
    await load();
  };

  const handleOpen = async (id: string) => {
    setError(null);
    const result = await store.read(id);
    if (!result.ok) {
      setError(storageErrorMessage(result.error));
      return;
    }
    // 端末の外へ出さないため、その場で作った参照だけで開く
    const url = URL.createObjectURL(result.value);
    window.open(url, "_blank", "noopener,noreferrer");
    // 開いたあとに参照を残さない。開くのに間に合う程度だけ待つ
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div>
        <h3 className="text-base font-semibold">
          {COPY.medicationDocument.heading}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {COPY.medicationDocument.description}
        </p>
      </div>

      {error && (
        <p
          className="rounded-xl border-2 border-destructive/40 bg-destructive/5 px-3 py-2 text-sm leading-relaxed"
          role="alert"
        >
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {COPY.medicationDocument.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="rounded-xl border border-border bg-card px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-base leading-snug">
                    <FileText
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 break-words">{document.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatByteSize(document.byteSize)} ·{" "}
                    {COPY.medicationDocument.updatedAtPrefix}{" "}
                    {formatTimestamp(document.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleOpen(document.id)}
                  >
                    {COPY.medicationDocument.openAction}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 min-h-9 w-9 min-w-9 shrink-0 border-destructive/30 bg-destructive/5"
                    aria-label={`「${document.title}」を消す`}
                    onClick={() => void handleRemove(document.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Label htmlFor="medication-document-file" className="sr-only">
          {COPY.medicationDocument.addAction}
        </Label>
        <input
          ref={fileInputRef}
          id="medication-document-file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => void handleFileChange(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="soft"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
          {COPY.medicationDocument.addAction}
        </Button>
      </div>

      {pending && (
        <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/40 p-3">
          <p className="break-words text-sm">
            {pending.file.name}（{formatByteSize(pending.file.size)}）
          </p>

          <div>
            <Label htmlFor="medication-document-title">
              {COPY.medicationDocument.titleLabel}
            </Label>
            <Input
              id="medication-document-title"
              className="mt-1"
              value={title}
              maxLength={MAX_DOCUMENT_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={COPY.medicationDocument.titlePlaceholder}
            />
          </div>

          {/* 2枚目以降は、増やすか差し替えるかを保存前に必ず選ばせる */}
          {documents.length > 0 && (
            <fieldset>
              <legend className="mb-1 block text-sm font-medium">
                {COPY.medicationDocument.chooseHeading}
              </legend>
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                {COPY.medicationDocument.chooseDescription}
              </p>
              <div
                role="radiogroup"
                aria-label={COPY.medicationDocument.chooseHeading}
                className="space-y-2"
              >
                <SelectionControl
                  selected={destination.replaceId === null}
                  mode="radio"
                  layout="row"
                  onClick={() => setDestination({ replaceId: null })}
                >
                  {COPY.medicationDocument.addAsNew}
                </SelectionControl>
                {documents.map((document) => (
                  <SelectionControl
                    key={document.id}
                    selected={destination.replaceId === document.id}
                    mode="radio"
                    layout="row"
                    onClick={() => setDestination({ replaceId: document.id })}
                  >
                    {COPY.medicationDocument.replacePrefix}
                    {document.title}
                  </SelectionControl>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy}
            >
              {busy
                ? "処理中…"
                : destination.replaceId === null
                  ? COPY.medicationDocument.confirmAdd
                  : COPY.medicationDocument.confirmReplace}
            </Button>
            <Button type="button" variant="outline" onClick={resetSelection}>
              {COPY.cancel}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1 rounded-xl bg-muted px-3 py-2">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {COPY.medicationDocument.notice}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {COPY.medicationDocument.backupNotice}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {COPY.medicationDocument.sharedDeviceNotice}
        </p>
      </div>
    </section>
  );
}

/** 一覧に出す日時。分までにとどめ、秒は出さない */
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${String(
    date.getHours()
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
