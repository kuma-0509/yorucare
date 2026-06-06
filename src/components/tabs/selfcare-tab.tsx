"use client";

import { useEffect, useState } from "react";
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
import { COPY } from "@/lib/copy";
import { MAX_SELF_CARE_TITLE_LENGTH } from "@/lib/schemas";
import {
  addSelfCareItem,
  deleteSelfCareItem,
  getAllSelfCareItems,
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

  const loadItems = () => {
    initSelfCareIfEmpty();
    setItems(getAllSelfCareItems());
  };

  const notifyDataChange = () => {
    onDataChange?.();
  };

  useEffect(() => {
    loadItems();
  }, []);

  const reload = () => {
    loadItems();
    notifyDataChange();
  };

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    const result = addSelfCareItem(title);
    if (!result.ok) return;
    setNewTitle("");
    reload();
  };

  const handleUpdate = () => {
    if (!editItem) return;
    const title = editTitle.trim();
    if (!title) return;
    const result = updateSelfCareItem(editItem.id, title);
    if (!result.ok) return;
    setEditItem(null);
    setEditTitle("");
    reload();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const result = deleteSelfCareItem(deleteTarget.id);
    if (!result.ok) return;
    setDeleteTarget(null);
    reload();
  };

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">{COPY.selfCareAction}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          自分に合う「{COPY.selfCareAction}」を登録しましょう。
          よく使うものは、今日の記録で選べます。
        </p>
      </header>

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
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button className="w-full" onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            追加する
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
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-sky-200/80 bg-sky-50/70 hover:bg-sky-50"
                    aria-label="編集"
                    onClick={() => {
                      if (!item?.id) return;
                      setEditItem(item);
                      setEditTitle(item.title ?? "");
                    }}
                  >
                    <Pencil className="h-5 w-5 text-sky-700" strokeWidth={2} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-11 w-11 min-w-11 shrink-0 border-red-200/80 bg-red-50/70 hover:bg-red-50"
                    aria-label="削除"
                    onClick={() => {
                      if (!item?.id) return;
                      setDeleteTarget(item);
                    }}
                  >
                    <Trash2 className="h-5 w-5 text-red-600" strokeWidth={2} />
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
          <Button className="w-full mt-4" onClick={handleUpdate}>
            保存する
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
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
