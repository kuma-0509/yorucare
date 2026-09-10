"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataBackupPanel } from "@/components/shared/data-backup-panel";
import { AnonymousAnalyticsPanel } from "@/components/shared/anonymous-analytics-panel";
import { AiSharePanel } from "@/components/shared/ai-share-panel";
import { LiveRegion } from "@/components/shared/live-region";
import { RecordsTable } from "@/components/records/records-table";
import {
  formatDisplayDate,
  getLast7Days,
  isWithinLast7Days,
} from "@/lib/dates";
import { buildRecordSummaryLines } from "@/lib/format";
import { COPY } from "@/lib/copy";
import { buildRecordsTable } from "@/lib/records-table";
import { storageErrorMessage } from "@/lib/result";
import {
  deleteAllRecords,
  deleteRecord,
  getAllRecords,
  getAllNotToDoItems,
  initSelfCareIfEmpty,
} from "@/lib/storage";
import type { AppTab } from "@/lib/types";
import type { DailyRecord, NotToDoItem, SelfCareItem } from "@/lib/types";

interface RecordsTabProps {
  onNavigateTab: (tab: AppTab, options?: { recordDate?: string }) => void;
  refreshKey?: number;
  onDataImported?: () => void;
}

export function RecordsTab({
  onNavigateTab,
  refreshKey = 0,
  onDataImported,
}: RecordsTabProps) {
  const [loaded, setLoaded] = useState(false);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [selfCareItems, setSelfCareItems] = useState<SelfCareItem[]>([]);
  const [notToDoItems, setNotToDoItems] = useState<NotToDoItem[]>([]);
  const [detailRecord, setDetailRecord] = useState<DailyRecord | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] =
    useState<DailyRecord | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const reloadRequestRef = useRef(0);

  const days = getLast7Days();

  const reload = useCallback(async () => {
    const requestId = ++reloadRequestRef.current;
    const [recordsResult, selfCareResult, notToDoResult] = await Promise.all([
      getAllRecords(),
      initSelfCareIfEmpty(),
      getAllNotToDoItems(),
    ]);
    if (requestId !== reloadRequestRef.current) return;
    setLoaded(true);
    if (!recordsResult.ok) {
      setMessage(storageErrorMessage(recordsResult.error));
      return;
    }
    if (!selfCareResult.ok) {
      setMessage(storageErrorMessage(selfCareResult.error));
      return;
    }
    if (!notToDoResult.ok) {
      setMessage(storageErrorMessage(notToDoResult.error));
      return;
    }
    setRecords(recordsResult.value);
    setSelfCareItems(selfCareResult.value);
    setNotToDoItems(notToDoResult.value);
    setMessage(null);
  }, []);

  useEffect(() => {
    void reload();
  }, [refreshKey, reload]);

  const table = buildRecordsTable({
    daysNewestFirst: [...days].reverse(),
    records,
    selfCareItems,
    notToDoItems,
  });

  const getRecord = (date: string) =>
    records.find((r) => r.date === date) ?? null;

  const canEditDate = (date: string) => isWithinLast7Days(date);

  const handleDeleteRecord = async () => {
    if (!deleteRecordTarget || deleting) return;
    setDeleting(true);
    const result = await deleteRecord(deleteRecordTarget.date);
    setDeleting(false);
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setDetailRecord((current) =>
      current?.date === deleteRecordTarget.date ? null : current
    );
    setDeleteRecordTarget(null);
    await reload();
    onDataImported?.();
  };

  const handleDeleteAllRecords = async () => {
    if (deleting) return;
    setDeleting(true);
    const result = await deleteAllRecords();
    setDeleting(false);
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setDetailRecord(null);
    setDeleteRecordTarget(null);
    setDeleteAllOpen(false);
    await reload();
    onDataImported?.();
  };

  if (!loaded) {
    return (
      <div className="space-y-4 pb-4">
        <header>
          <h1 className="text-xl font-bold">{COPY.tab.records}</h1>
          <p className="mt-2 text-sm text-muted-foreground">読み込み中…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">{COPY.tab.records}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {COPY.recordsList.description}
          {COPY.recordsList.scrollHint}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {COPY.recordsList.emptyGuide}
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

      <RecordsTable
        columns={table.columns}
        rows={table.rows}
        canEditDate={canEditDate}
        onViewDetail={(date) => {
          const record = getRecord(date);
          if (record) setDetailRecord(record);
        }}
        onEdit={(date) => onNavigateTab("today", { recordDate: date })}
        onAdd={(date) => onNavigateTab("today", { recordDate: date })}
      />

      <Card className="bg-muted/60">
        <CardContent className="space-y-2 py-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            記録はこの端末のブラウザ内に保存されます。共有端末では、個人情報の入力にご注意ください。不要になった記録は削除できます。
          </p>
          <p className="text-xs">
            レビュー時は、本名・診断名・詳しい服薬名などを必要以上に入力しすぎないようご注意ください。
          </p>
        </CardContent>
      </Card>

      <AiSharePanel records={records} selfCareItems={selfCareItems} />

      <DataBackupPanel
        onImported={() => {
          void reload();
          onDataImported?.();
        }}
      />

      <AnonymousAnalyticsPanel />

      <Card className="border-caution-border/50 bg-caution/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {COPY.deleteAllSharedDeviceHeading}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {COPY.deleteAllSharedDeviceBody}
          </p>
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={records.length === 0}
            onClick={() => setDeleteAllOpen(true)}
          >
            {COPY.deleteAllTitle}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={!!detailRecord}
        onOpenChange={(open) => !open && setDetailRecord(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detailRecord && formatDisplayDate(detailRecord.date)}
            </DialogTitle>
          </DialogHeader>
          {detailRecord && (
            <div className="space-y-3 text-base">
              {buildRecordSummaryLines(
                detailRecord,
                selfCareItems,
                notToDoItems
              ).map(
                ({ label, value }) => (
                  <div key={label}>
                    <span className="text-muted-foreground">
                      {label}：
                    </span>
                    {value}
                  </div>
                )
              )}
              {detailRecord.warningTags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">
                    気になったこと（詳細）：
                  </span>
                  {detailRecord.warningTags.join("、")}
                </div>
              )}
              {detailRecord.warningNote && (
                <div>
                  <span className="text-muted-foreground">
                    その他：
                  </span>
                  {detailRecord.warningNote}
                </div>
              )}
              {detailRecord.selfCareMemo && (
                <div>
                  <span className="text-muted-foreground">
                    {COPY.selfCareAction}のメモ：
                  </span>
                  <p className="whitespace-pre-wrap">
                    {detailRecord.selfCareMemo}
                  </p>
                </div>
              )}
              {detailRecord.note && (
                <div>
                  <span className="text-muted-foreground">
                    {COPY.memo}：
                  </span>
                  <p className="whitespace-pre-wrap">{detailRecord.note}</p>
                </div>
              )}
              <div className="border-t pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setDeleteRecordTarget(detailRecord);
                    setDetailRecord(null);
                  }}
                >
                  {COPY.delete}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteRecordTarget}
        onOpenChange={(open) => !open && setDeleteRecordTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除の確認</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            この記録を削除しますか？この操作は元に戻せません。
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteRecordTarget(null)}
            >
              {COPY.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteRecord()}
              disabled={deleting}
            >
              {deleting ? "削除中…" : COPY.delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteAllOpen}
        onOpenChange={(open) => !open && setDeleteAllOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COPY.deleteAllTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            {COPY.deleteAllConfirmBody}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {COPY.deleteAllConfirmNote}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteAllOpen(false)}
            >
              {COPY.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteAllRecords()}
              disabled={deleting}
            >
              {deleting ? "削除中…" : COPY.deleteAllTitle}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LiveRegion message={message} />
    </div>
  );
}
