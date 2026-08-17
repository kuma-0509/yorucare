"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiveRegion } from "@/components/shared/live-region";
import { SelectionControl } from "@/components/shared/option-button";
import { STATE_LEVEL_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { storageErrorMessage } from "@/lib/result";
import { MAX_SELF_CARE_TITLE_LENGTH } from "@/lib/schemas";
import { describeStateLevels } from "@/lib/self-care-list";
import {
  addSelfCareItem,
  deleteSelfCareItem,
  initSelfCareIfEmpty,
  updateSelfCareItem,
} from "@/lib/storage";
import type { SelfCareItem, SelfCareItemKind, StateLevel } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface SelfCareTabProps {
  onDataChange?: () => void;
}

const KIND_OPTIONS: { value: SelfCareItemKind; label: string }[] = [
  { value: "care", label: COPY.selfCareAction },
  { value: "avoid", label: COPY.avoid.action },
];

export function SelfCareTab({ onDataChange }: SelfCareTabProps) {
  const [items, setItems] = useState<SelfCareItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<SelfCareItemKind>("care");
  const [newStateLevels, setNewStateLevels] = useState<StateLevel[]>([]);
  const [editItem, setEditItem] = useState<SelfCareItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editKind, setEditKind] = useState<SelfCareItemKind>("care");
  const [editStateLevels, setEditStateLevels] = useState<StateLevel[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SelfCareItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const result = await initSelfCareIfEmpty();
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return false;
    }
    setItems(result.value);
    setMessage(null);
    return true;
  }, []);

  const notifyDataChange = () => {
    onDataChange?.();
  };

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const reload = async () => {
    if (await loadItems()) {
      notifyDataChange();
    }
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    const result = await addSelfCareItem({
      title,
      kind: newKind,
      stateLevels: newStateLevels,
    });
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setNewTitle("");
    setNewStateLevels([]);
    await reload();
    setBusy(false);
  };

  const openEdit = (item: SelfCareItem) => {
    setEditItem(item);
    setEditTitle(item.title ?? "");
    setEditKind(item.kind);
    setEditStateLevels([...item.stateLevels]);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const title = editTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    const result = await updateSelfCareItem(editItem.id, {
      title,
      kind: editKind,
      stateLevels: editStateLevels,
    });
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setEditItem(null);
    setEditTitle("");
    await reload();
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    const result = await deleteSelfCareItem(deleteTarget.id);
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setDeleteTarget(null);
    await reload();
    setBusy(false);
  };

  const careItems = items.filter((item) => item.kind === "care");
  const avoidItems = items.filter((item) => item.kind === "avoid");

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">{COPY.selfCareAction}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          自分に合う「{COPY.selfCareAction}」を登録しましょう。
          よく使うものは、今日の記録で選べます。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {COPY.avoid.tabDescription}
        </p>
      </header>

      {message && (
        <div
          className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 px-4 py-3"
          role="alert"
        >
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新しく追加</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={MAX_SELF_CARE_TITLE_LENGTH}
            placeholder={
              newKind === "care"
                ? "例：帰宅後に10分横になる"
                : "例：大きな買いものを決める"
            }
            aria-label="名前"
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
          />

          <KindPicker value={newKind} onChange={setNewKind} />

          <StateLevelPicker
            value={newStateLevels}
            onChange={setNewStateLevels}
          />

          <Button
            className="w-full"
            onClick={() => void handleAdd()}
            disabled={busy}
          >
            <Plus className="h-4 w-4" />
            {busy ? "処理中…" : "追加する"}
          </Button>
        </CardContent>
      </Card>

      <ItemList
        heading={`登録済みの${COPY.selfCareAction}`}
        items={careItems}
        emptyText="まだ登録がありません。上の欄から追加できます。"
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <ItemList
        heading={`登録済みの${COPY.avoid.action}`}
        items={avoidItems}
        emptyText={COPY.avoid.emptyList}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />

      <Dialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編集</DialogTitle>
            <DialogDescription className="sr-only">
              登録済みの項目の名前、種類、出す日を変更できます。
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={MAX_SELF_CARE_TITLE_LENGTH}
              aria-label="名前"
            />
            <KindPicker value={editKind} onChange={setEditKind} />
            <StateLevelPicker
              value={editStateLevels}
              onChange={setEditStateLevels}
            />
          </div>
          <Button
            className="mt-4 w-full"
            onClick={() => void handleUpdate()}
            disabled={busy}
          >
            {busy ? "処理中…" : COPY.save}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              この項目を削除しますか？
              {deleteTarget?.title ? (
                <>
                  <br />
                  <span className="mt-1 block font-medium text-foreground">
                    「{deleteTarget.title}」
                  </span>
                </>
              ) : null}
              {deleteTarget?.kind === "care"
                ? "過去の記録からも選べなくなります。"
                : "今日の記録には表示されなくなります。"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {COPY.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={busy}
            >
              {busy ? "削除中…" : COPY.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LiveRegion message={message} />
    </div>
  );
}

function KindPicker({
  value,
  onChange,
}: {
  value: SelfCareItemKind;
  onChange: (kind: SelfCareItemKind) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 block text-sm text-muted-foreground">種類</legend>
      <div role="radiogroup" aria-label="種類" className="flex gap-2">
        {KIND_OPTIONS.map(({ value: kind, label }) => (
          <SelectionControl
            key={kind}
            selected={value === kind}
            mode="radio"
            layout="chip"
            onClick={() => onChange(kind)}
          >
            {label}
          </SelectionControl>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * どの状態の日に出すかを本人が選ぶ。
 * ひとつも選ばなければ状態を問わず出す（既存の登録と同じ振る舞い）。
 */
function StateLevelPicker({
  value,
  onChange,
}: {
  value: StateLevel[];
  onChange: (levels: StateLevel[]) => void;
}) {
  const toggle = (level: StateLevel) => {
    onChange(
      value.includes(level)
        ? value.filter((l) => l !== level)
        : [...value, level]
    );
  };

  return (
    <fieldset>
      <legend className="mb-1 block text-sm text-muted-foreground">
        {COPY.avoid.stateHeading}
      </legend>
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
        {COPY.avoid.stateDescription}
      </p>
      <div
        role="group"
        aria-label={COPY.avoid.stateHeading}
        className="flex flex-wrap gap-2"
      >
        {STATE_LEVEL_OPTIONS.map(({ value: level, label }) => (
          <SelectionControl
            key={level}
            selected={value.includes(level)}
            mode="checkbox"
            layout="chip"
            onClick={() => toggle(level)}
          >
            {label}
          </SelectionControl>
        ))}
      </div>
    </fieldset>
  );
}

function ItemList({
  heading,
  items,
  emptyText,
  onEdit,
  onDelete,
}: {
  heading: string;
  items: SelfCareItem[];
  emptyText: string;
  onEdit: (item: SelfCareItem) => void;
  onDelete: (item: SelfCareItem) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">{heading}</h2>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-2 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-base leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {describeStateLevels(item.stateLevels)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-primary/30 bg-primary/5 hover:bg-primary/10"
                  aria-label={`「${item.title}」を編集`}
                  onClick={() => {
                    if (!item?.id) return;
                    onEdit(item);
                  }}
                >
                  <Pencil className="h-5 w-5 text-primary" strokeWidth={2} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                  aria-label={`「${item.title}」を削除`}
                  onClick={() => {
                    if (!item?.id) return;
                    onDelete(item);
                  }}
                >
                  <Trash2 className="h-5 w-5 text-destructive" strokeWidth={2} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
