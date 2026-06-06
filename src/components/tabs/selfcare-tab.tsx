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

  const reload = useCallback(() => {
    initSelfCareIfEmpty();
    setItems(getAllSelfCareItems());
    onDataChange?.();
  }, [onDataChange]);

  useEffect(() => {
    reload();
  }, [reload]);

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
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <p className="flex-1 text-base">{item.title}</p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="編集"
                    onClick={() => {
                      setEditItem(item);
                      setEditTitle(item.title);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="削除"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
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
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            「{deleteTarget?.title}」を削除しますか？
            過去の記録からも選べなくなります。
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button variant="destructive" onClick={handleDelete}>
              削除する
            </Button>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
