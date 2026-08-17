"use client";

import { useEffect, useState } from "react";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LiveRegion } from "@/components/shared/live-region";
import { COPY } from "@/lib/copy";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";
import { MAX_MEDICATION_NOTE_LENGTH } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface MedicationNoteDialogProps {
  compact?: boolean;
}

/**
 * 必要なときに自分で開いて見せるための、お薬の覚え書き。
 *
 * 日々の記録とは別に1つだけ持ち、集計にもグラフにも使わない。
 * 本人が開いたときだけ表示し、端末の外へ出す手段（共有・送信）は用意しない。
 * 中身の妥当性は判断せず、お薬のことは主治医・薬剤師へ相談する旨だけを添える。
 */
export function MedicationNoteDialog({
  compact = false,
}: MedicationNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setMessage(null);
    void repository.getMedicationNote().then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.ok) {
        setMessage(storageErrorMessage(result.error));
        return;
      }
      setNote(result.value);
      setDraft(result.value);
      // 未入力なら、開いた時点で書ける状態にしておく
      setEditing(result.value.length === 0);
    });
    return () => {
      active = false;
    };
  }, [open]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const result = await repository.saveMedicationNote(draft);
    setSaving(false);
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return;
    }
    const saved = draft.trim().length === 0 ? "" : draft;
    setNote(saved);
    setDraft(saved);
    setEditing(false);
    setMessage(saved.length === 0 ? COPY.medicationNote.cleared : COPY.medicationNote.saved);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("shrink-0 px-3", compact && "min-h-10")}
          aria-label="お薬メモを開く"
        >
          <Pill className="h-4 w-4" aria-hidden="true" />
          {COPY.medicationNote.triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" aria-hidden="true" />
            {COPY.medicationNote.title}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {COPY.medicationNote.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          {message && (
            <p
              className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed"
              role="status"
            >
              {message}
            </p>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中…</p>
          ) : editing ? (
            <>
              <div>
                <Label htmlFor="medication-note" className="sr-only">
                  {COPY.medicationNote.title}
                </Label>
                <Textarea
                  id="medication-note"
                  value={draft}
                  maxLength={MAX_MEDICATION_NOTE_LENGTH}
                  rows={6}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={COPY.medicationNote.placeholder}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? "保存中…" : COPY.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDraft(note);
                    setEditing(false);
                    setMessage(null);
                  }}
                >
                  {COPY.cancel}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap rounded-xl bg-muted px-4 py-3 text-base leading-relaxed">
                {note.length > 0 ? note : COPY.medicationNote.empty}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraft(note);
                  setEditing(true);
                  setMessage(null);
                }}
              >
                {COPY.medicationNote.editAction}
              </Button>
            </>
          )}

          <div className="space-y-1 rounded-xl bg-muted px-3 py-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {COPY.medicationNote.notice}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {COPY.medicationNote.sharedDeviceNotice}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {COPY.medicationNote.medicalNotice}
            </p>
          </div>
        </div>
        <LiveRegion message={message} />
      </DialogContent>
    </Dialog>
  );
}
