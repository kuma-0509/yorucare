"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { COPY } from "@/lib/copy";
import { storageErrorMessage } from "@/lib/result";
import { MAX_SELF_CARE_TITLE_LENGTH } from "@/lib/schemas";
import {
  addNotToDoItem,
  addSelfCareItem,
  deleteNotToDoItem,
  deleteSelfCareItem,
  getAllNotToDoItems,
  initSelfCareIfEmpty,
  updateNotToDoItem,
  updateSelfCareItem,
} from "@/lib/storage";
import type { NotToDoItem, SelfCareItem } from "@/lib/types";

interface SelfCareTabProps {
  onDataChange?: () => void;
}

type RegistryKind = "selfCare" | "notToDo";
type RegistryItem = SelfCareItem | NotToDoItem;

interface ItemTarget {
  kind: RegistryKind;
  item: RegistryItem;
}

const REGISTRY_COPY = {
  selfCare: {
    label: COPY.selfCareAction,
    description: `その日の「${COPY.doneToday}」として選ぶ項目です。`,
    placeholder: "例：帰宅後に10分横になる",
  },
  notToDo: {
    label: COPY.notToDoAction,
    description: `その日に「${COPY.notToDoAction}」と決める項目です。`,
    placeholder: "例：夜は仕事のメールを開かない",
  },
} as const;

export function SelfCareTab({ onDataChange }: SelfCareTabProps) {
  const [selfCareItems, setSelfCareItems] = useState<SelfCareItem[]>([]);
  const [notToDoItems, setNotToDoItems] = useState<NotToDoItem[]>([]);
  const [newTitles, setNewTitles] = useState<Record<RegistryKind, string>>({
    selfCare: "",
    notToDo: "",
  });
  const [editTarget, setEditTarget] = useState<ItemTarget | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ItemTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const [selfCareResult, notToDoResult] = await Promise.all([
      initSelfCareIfEmpty(),
      getAllNotToDoItems(),
    ]);
    if (!selfCareResult.ok) {
      setMessage(storageErrorMessage(selfCareResult.error));
      return false;
    }
    if (!notToDoResult.ok) {
      setMessage(storageErrorMessage(notToDoResult.error));
      return false;
    }
    setSelfCareItems(selfCareResult.value);
    setNotToDoItems(notToDoResult.value);
    setMessage(null);
    return true;
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const reload = async () => {
    if (await loadItems()) onDataChange?.();
  };

  const handleAdd = async (kind: RegistryKind) => {
    const title = newTitles[kind].trim();
    if (!title || busy) return;

    setBusy(true);
    const result =
      kind === "selfCare"
        ? await addSelfCareItem(title)
        : await addNotToDoItem(title);
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setNewTitles((titles) => ({ ...titles, [kind]: "" }));
    await reload();
    setBusy(false);
  };

  const handleUpdate = async () => {
    if (!editTarget || busy) return;
    const title = editTitle.trim();
    if (!title) return;

    setBusy(true);
    const result =
      editTarget.kind === "selfCare"
        ? await updateSelfCareItem(editTarget.item.id, title)
        : await updateNotToDoItem(editTarget.item.id, title);
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setEditTarget(null);
    setEditTitle("");
    await reload();
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget || busy) return;

    setBusy(true);
    const result =
      deleteTarget.kind === "selfCare"
        ? await deleteSelfCareItem(deleteTarget.item.id)
        : await deleteNotToDoItem(deleteTarget.item.id);
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setDeleteTarget(null);
    await reload();
    setBusy(false);
  };

  return (
    <div className="space-y-6 pb-4">
      <header>
        <h1 className="text-xl font-bold">{COPY.tab.selfCare}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {COPY.selfCareTabDescription}
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

      <RegistrySection
        kind="selfCare"
        items={selfCareItems}
        newTitle={newTitles.selfCare}
        busy={busy}
        onNewTitleChange={(title) =>
          setNewTitles((titles) => ({ ...titles, selfCare: title }))
        }
        onAdd={() => void handleAdd("selfCare")}
        onEdit={(item) => {
          setEditTarget({ kind: "selfCare", item });
          setEditTitle(item.title);
        }}
        onDelete={(item) => setDeleteTarget({ kind: "selfCare", item })}
      />

      <RegistrySection
        kind="notToDo"
        items={notToDoItems}
        newTitle={newTitles.notToDo}
        busy={busy}
        onNewTitleChange={(title) =>
          setNewTitles((titles) => ({ ...titles, notToDo: title }))
        }
        onAdd={() => void handleAdd("notToDo")}
        onEdit={(item) => {
          setEditTarget({ kind: "notToDo", item });
          setEditTitle(item.title);
        }}
        onDelete={(item) => setDeleteTarget({ kind: "notToDo", item })}
      />

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? REGISTRY_COPY[editTarget.kind].label : ""}を編集
            </DialogTitle>
            <DialogDescription className="sr-only">
              登録済みの項目名を変更できます。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            maxLength={MAX_SELF_CARE_TITLE_LENGTH}
            className="mt-2"
            aria-label="編集後の名前"
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleUpdate();
            }}
          />
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
              この「
              {deleteTarget ? REGISTRY_COPY[deleteTarget.kind].label : "項目"}
              」を削除しますか？
              {deleteTarget?.item.title ? (
                <span className="mt-1 block font-medium text-foreground">
                  「{deleteTarget.item.title}」
                </span>
              ) : null}
              過去の記録からも選べなくなります。
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

function RegistrySection({
  kind,
  items,
  newTitle,
  busy,
  onNewTitleChange,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: RegistryKind;
  items: RegistryItem[];
  newTitle: string;
  busy: boolean;
  onNewTitleChange: (title: string) => void;
  onAdd: () => void;
  onEdit: (item: RegistryItem) => void;
  onDelete: (item: RegistryItem) => void;
}) {
  const copy = REGISTRY_COPY[kind];
  const headingId = `${kind}-registry-heading`;

  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div>
        <h2 id={headingId} className="text-lg font-semibold">
          {copy.label}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">新しく追加</CardTitle>
          <CardDescription className="sr-only">
            {copy.label}を追加します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={newTitle}
            onChange={(event) => onNewTitleChange(event.target.value)}
            maxLength={MAX_SELF_CARE_TITLE_LENGTH}
            placeholder={copy.placeholder}
            aria-label={`新しい${copy.label}`}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAdd();
            }}
          />
          <Button className="w-full" onClick={onAdd} disabled={busy}>
            <Plus className="h-4 w-4" />
            {busy ? "処理中…" : `${copy.label}を追加する`}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">登録済みの{copy.label}</h3>
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              まだ登録がありません。上の欄から追加できます。
            </CardContent>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-2 py-4">
                <p className="min-w-0 flex-1 text-base leading-snug">
                  {item.title}
                </p>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-primary/30 bg-primary/5 hover:bg-primary/10"
                    aria-label={`${item.title}を編集`}
                    onClick={() => onEdit(item)}
                  >
                    <Pencil className="h-5 w-5 text-primary" strokeWidth={2} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                    aria-label={`${item.title}を削除`}
                    onClick={() => onDelete(item)}
                  >
                    <Trash2
                      className="h-5 w-5 text-destructive"
                      strokeWidth={2}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
