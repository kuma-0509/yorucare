"use client";

import { useCallback, useEffect, useState } from "react";
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
  addSelfCareItem,
  deleteSelfCareItem,
  initSelfCareIfEmpty,
  updateSelfCareItem,
} from "@/lib/storage";
import type { SelfCareItem } from "@/lib/types";
import { Pencil, Plus, Trash2 } from "lucide-react";

interface SelfCareTabProps {
  onDataChange?: () => void;
}

export function SelfCareTab({ onDataChange }: SelfCareTabProps) {
  const [items, setItems] = useState<SelfCareItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editItem, setEditItem] = useState<SelfCareItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
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
    const result = await addSelfCareItem(title);
    if (!result.ok) {
      setBusy(false);
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setNewTitle("");
    await reload();
    setBusy(false);
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const title = editTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    const result = await updateSelfCareItem(editItem.id, title);
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

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">{COPY.selfCareAction}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {COPY.selfCareRelation.registryDescription}
        </p>
        {/* 登録簿と、その日の実施記録（「できたこと」）が同じ機能であることを示す */}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {COPY.selfCareRelation.registryToRecord}
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
        <CardContent className="space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={MAX_SELF_CARE_TITLE_LENGTH}
            placeholder="例：帰宅後に10分横になる"
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
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

      <div className="space-y-3">
        <h2 className="text-base font-semibold">登録済みの{COPY.selfCareAction}</h2>
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
                <p className="min-w-0 flex-1 text-base leading-snug">{item.title}</p>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-primary/30 bg-primary/5 hover:bg-primary/10"
                    aria-label="編集"
                    onClick={() => {
                      if (!item?.id) return;
                      setEditItem(item);
                      setEditTitle(item.title ?? "");
                    }}
                  >
                    <Pencil className="h-5 w-5 text-primary" strokeWidth={2} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                    aria-label="削除"
                    onClick={() => {
                      if (!item?.id) return;
                      setDeleteTarget(item);
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

      <Dialog
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COPY.selfCareAction}を編集</DialogTitle>
            <DialogDescription className="sr-only">
              登録済みの{COPY.selfCareAction}の名前を変更できます。
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={MAX_SELF_CARE_TITLE_LENGTH}
            className="mt-2"
          />
          <Button
            className="w-full mt-4"
            onClick={() => void handleUpdate()}
            disabled={busy}
          >
            {busy ? "処理中…" : "保存する"}
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
              この「{COPY.selfCareAction}」を削除しますか？
              {deleteTarget?.title ? (
                <>
                  <br />
                  <span className="mt-1 block font-medium text-foreground">
                    「{deleteTarget.title}」
                  </span>
                </>
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
