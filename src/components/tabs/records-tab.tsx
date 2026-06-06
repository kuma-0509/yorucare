"use client";

import { useEffect, useState } from "react";
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
import {
  formatDisplayDate,
  getLast7Days,
  isWithinLast7Days,
} from "@/lib/dates";
import {
  formatSelfCareSummary,
  formatSleepSummary,
  getMedicationLabel,
  getMoodLabel,
  getWarningLabel,
  buildRecordSummaryLines,
  isMeaningfulSummaryValue,
} from "@/lib/format";
import { formatMoodLabelsDisplay } from "@/lib/mood-labels";
import { COPY } from "@/lib/copy";
import {
  deleteAllRecords,
  deleteRecord,
  getAllRecords,
  getAllSelfCareItems,
  initSelfCareIfEmpty,
  isDailyRecordEmpty,
} from "@/lib/storage";
import type { AppTab } from "@/lib/types";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

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
  const [detailRecord, setDetailRecord] = useState<DailyRecord | null>(null);
  const [deleteRecordTarget, setDeleteRecordTarget] =
    useState<DailyRecord | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const days = getLast7Days();

  const reload = () => {
    initSelfCareIfEmpty();
    setRecords(getAllRecords());
    setSelfCareItems(getAllSelfCareItems());
    setLoaded(true);
  };

  useEffect(() => {
    reload();
  }, [refreshKey]);

  const getRecord = (date: string) =>
    records.find((r) => r.date === date) ?? null;

  const canEditDate = (date: string) => isWithinLast7Days(date);

  const handleDeleteRecord = () => {
    if (!deleteRecordTarget) return;
    const result = deleteRecord(deleteRecordTarget.date);
    if (!result.ok) return;
    setDetailRecord((current) =>
      current?.date === deleteRecordTarget.date ? null : current
    );
    setDeleteRecordTarget(null);
    reload();
    onDataImported?.();
  };

  const handleDeleteAllRecords = () => {
    const result = deleteAllRecords();
    if (!result.ok) return;
    setDetailRecord(null);
    setDeleteRecordTarget(null);
    setDeleteAllOpen(false);
    reload();
    onDataImported?.();
  };

  if (!loaded) {
    return (
      <div className="space-y-4 pb-4">
        <header>
          <h1 className="text-xl font-bold">これまで</h1>
          <p className="mt-2 text-sm text-muted-foreground">読み込み中…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">これまで</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          直近7日の記録です。1週間以内ならあとから直せます。
        </p>
      </header>

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

      <div className="space-y-3">
        {[...days].reverse().map((date) => {
          const record = getRecord(date);
          const hasRecord = record !== null;

          if (!hasRecord) {
            return (
              <Card
                key={date}
                className="border-dashed bg-muted/50 opacity-90"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    {formatDisplayDate(date)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    この日はまだ記録がありません。
                    <br />
                    気分だけでも、あとから残せます。
                  </p>
                  {canEditDate(date) && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        onNavigateTab("today", { recordDate: date })
                      }
                    >
                      この日の記録をつける
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          }

          const isEmptySaved = isDailyRecordEmpty(record);

          const previewLines = [
            { label: "気分", value: getMoodLabel(record.moodScore) },
            ...(record.moodLabels.length > 0
              ? [
                  {
                    label: "気持ち",
                    value: formatMoodLabelsDisplay(record.moodLabels),
                  },
                ]
              : []),
            { label: "睡眠", value: formatSleepSummary(record) },
            { label: "お薬", value: getMedicationLabel(record.medication) },
            {
              label: "しんどさのサイン",
              value: getWarningLabel(record.warningLevel),
            },
            {
              label: "今日できたこと",
              value: formatSelfCareSummary(record, selfCareItems),
            },
          ].filter((line) => isMeaningfulSummaryValue(line.value));

          return (
            <Card
              key={date}
              className={isEmptySaved ? "border-dashed bg-muted/40" : undefined}
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={
                    isEmptySaved
                      ? "text-base font-medium text-muted-foreground"
                      : "text-base"
                  }
                >
                  {formatDisplayDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {isEmptySaved ? (
                  <p className="leading-relaxed text-muted-foreground">
                    保存だけした日です。気分など、あとから足せます。
                  </p>
                ) : (
                  previewLines.map((line) => (
                    <RecordPreviewLine
                      key={line.label}
                      label={line.label}
                      value={line.value}
                    />
                  ))
                )}
                <div className="flex flex-col gap-2 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setDetailRecord(record)}
                  >
                    詳しく見る
                  </Button>
                  {canEditDate(date) && (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        onNavigateTab("today", { recordDate: date })
                      }
                    >
                      編集する
                    </Button>
                  )}
                  <Button
                    variant="warning"
                    onClick={() => setDeleteRecordTarget(record)}
                  >
                    この記録を削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DataBackupPanel
        onImported={() => {
          reload();
          onDataImported?.();
        }}
      />

      <Card className="border-orange-200 bg-orange-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">共有端末で使い終わったら</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            この端末のブラウザに保存されたYoruCareの記録だけを削除します。セルフケア項目や他のlocalStorageデータは削除しません。
          </p>
          <Button
            type="button"
            variant="warning"
            className="w-full"
            disabled={records.length === 0}
            onClick={() => setDeleteAllOpen(true)}
          >
            すべての記録を削除
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
              {buildRecordSummaryLines(detailRecord, selfCareItems).map(
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
                  variant="warning"
                  className="w-full"
                  onClick={() => {
                    setDeleteRecordTarget(detailRecord);
                    setDetailRecord(null);
                  }}
                >
                  この記録を削除
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
            <Button type="button" variant="warning" onClick={handleDeleteRecord}>
              この記録を削除
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteRecordTarget(null)}
            >
              キャンセル
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
            <DialogTitle>すべての記録を削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed">
            この端末に保存された記録をすべて削除しますか？この操作は元に戻せません。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            削除するのは、この端末のlocalStorageに保存されたYoruCareの記録のみです。
          </p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="warning"
              onClick={handleDeleteAllRecords}
            >
              すべての記録を削除
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteAllOpen(false)}
            >
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordPreviewLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <p>
      <span className="text-muted-foreground">{label}：</span>
      {value}
    </p>
  );
}
