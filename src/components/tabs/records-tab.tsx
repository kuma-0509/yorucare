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
import { formatDisplayDate, getLast7Days, getTodayString, getYesterdayString } from "@/lib/dates";
import {
  formatSelfCareSummary,
  formatSleepSummary,
  getMedicationLabel,
  getMoodLabel,
  getWarningLabel,
  buildRecordSummaryLines,
} from "@/lib/format";
import {
  getAllRecords,
  getAllSelfCareItems,
  initSelfCareIfEmpty,
  isRecordedDay,
} from "@/lib/storage";
import type { AppTab } from "@/lib/types";
import type { DailyRecord, SelfCareItem } from "@/lib/types";

interface RecordsTabProps {
  onNavigateTab: (tab: AppTab, options?: { recordDate?: string }) => void;
  refreshKey?: number;
}

export function RecordsTab({
  onNavigateTab,
  refreshKey = 0,
}: RecordsTabProps) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [selfCareItems, setSelfCareItems] = useState<SelfCareItem[]>([]);
  const [detailRecord, setDetailRecord] = useState<DailyRecord | null>(null);

  const days = getLast7Days();
  const today = getTodayString();
  const yesterday = getYesterdayString();

  useEffect(() => {
    initSelfCareIfEmpty();
    setRecords(getAllRecords());
    setSelfCareItems(getAllSelfCareItems());
  }, [refreshKey]);

  const getRecord = (date: string) =>
    records.find((r) => r.date === date) ?? null;

  const canEditDate = (date: string) =>
    date === today || date === yesterday;

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-xl font-bold">記録</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          直近7日の記録です。
        </p>
      </header>

      <div className="space-y-3">
        {[...days].reverse().map((date) => {
          const record = getRecord(date);
          const hasRecord = isRecordedDay(date);

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

          return (
            <Card key={date}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {formatDisplayDate(date)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <RecordPreviewLine
                  label="気分"
                  value={getMoodLabel(record!.moodScore)}
                />
                {record!.moodLabels.length > 0 && (
                  <RecordPreviewLine
                    label="気持ち"
                    value={record!.moodLabels.join("、")}
                  />
                )}
                <RecordPreviewLine
                  label="睡眠"
                  value={formatSleepSummary(record!)}
                />
                <RecordPreviewLine
                  label="服薬"
                  value={getMedicationLabel(record!.medication)}
                />
                <RecordPreviewLine
                  label="注意サイン"
                  value={getWarningLabel(record!.warningLevel)}
                />
                <RecordPreviewLine
                  label="セルフケア"
                  value={formatSelfCareSummary(record!, selfCareItems)}
                />
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
                    注意サイン詳細：
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
                    セルフケアメモ：
                  </span>
                  <p className="whitespace-pre-wrap">
                    {detailRecord.selfCareMemo}
                  </p>
                </div>
              )}
              {detailRecord.note && (
                <div>
                  <span className="text-muted-foreground">
                    特記事項：
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
