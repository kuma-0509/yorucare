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
import { formatDisplayDate, getLast7Days, getTodayString, getYesterdayString } from "@/lib/dates";
import {
  formatSelfCareSummary,
  formatSleepSummary,
  getMedicationLabel,
  getMoodLabel,
  getWarningLabel,
  buildRecordSummaryLines,
  isMeaningfulSummaryValue,
} from "@/lib/format";
import {
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

  const days = getLast7Days();
  const today = getTodayString();
  const yesterday = getYesterdayString();

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

  const canEditDate = (date: string) =>
    date === today || date === yesterday;

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
          直近7日の記録です。今日と昨日だけ直せます。
        </p>
      </header>

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
              ? [{ label: "気持ち", value: record.moodLabels.join("、") }]
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
                    セルフケアのメモ：
                  </span>
                  <p className="whitespace-pre-wrap">
                    {detailRecord.selfCareMemo}
                  </p>
                </div>
              )}
              {detailRecord.note && (
                <div>
                  <span className="text-muted-foreground">
                    自由メモ：
                  </span>
                  <p className="whitespace-pre-wrap">{detailRecord.note}</p>
                </div>
              )}
            </div>
          )}
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
