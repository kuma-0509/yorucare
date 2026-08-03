"use client";

import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveRegion } from "@/components/shared/live-region";
import {
  buildWeeklySummary,
  buildWeeklySummaryText,
  WEEKLY_SUMMARY_DAYS,
  type WeeklySummary,
} from "@/lib/ai/weekly-summary";
import { formatShortDate, getTodayString, toDateString } from "@/lib/dates";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";

interface WeeklySummaryCardProps {
  refreshKey?: number;
}

/** 直近 WEEKLY_SUMMARY_DAYS 日の期間。記録の入力範囲と揃える */
function currentRange(): { from: string; to: string } {
  const start = new Date();
  start.setDate(start.getDate() - (WEEKLY_SUMMARY_DAYS - 1));
  return { from: toDateString(start), to: getTodayString() };
}

export function WeeklySummaryCard({ refreshKey = 0 }: WeeklySummaryCardProps) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage(null);

    const load = async () => {
      const records = await repository.getAllRecords();
      if (!active) return;
      if (!records.ok) {
        setLoading(false);
        setSummary(null);
        setMessage(storageErrorMessage(records.error));
        return;
      }
      const selfCare = await repository.getAllSelfCareItems();
      if (!active) return;
      setLoading(false);
      if (!selfCare.ok) {
        setSummary(null);
        setMessage(storageErrorMessage(selfCare.error));
        return;
      }
      const { from, to } = currentRange();
      setSummary(
        buildWeeklySummary(records.value, selfCare.value, from, to)
      );
    };

    void load();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const handleCopy = async () => {
    if (!summary) return;
    if (!navigator.clipboard?.writeText) {
      setMessage("このブラウザではコピーできません。");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildWeeklySummaryText(summary));
      setMessage("まとめをコピーしました。渡す相手はご自身で選べます。");
    } catch {
      setMessage("コピーできませんでした。");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>週のまとめ</CardTitle>
        <CardDescription className="mt-1 text-base leading-relaxed">
          {summary
            ? `${formatShortDate(summary.range.from)} 〜 ${formatShortDate(summary.range.to)}`
            : `直近${WEEKLY_SUMMARY_DAYS}日間`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && !summary ? (
          <div
            className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-foreground"
            role="alert"
          >
            {message}
          </div>
        ) : loading || !summary ? (
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted" aria-hidden />
        ) : (
          <>
            <p className="text-base leading-relaxed">{summary.headline}</p>

            {summary.lines.length > 0 && (
              <dl className="space-y-3">
                {summary.lines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-xl bg-muted/50 px-4 py-3"
                  >
                    <dt className="text-xs text-muted-foreground">
                      {line.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium">{line.value}</dd>
                    {line.note && (
                      <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {line.note}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            )}

            {summary.highlights.map((highlight) => (
              <div key={highlight.id} className="space-y-1">
                <h3 className="text-xs text-muted-foreground">
                  {highlight.label}
                </h3>
                <p className="text-sm leading-relaxed">
                  {highlight.items.join("、")}
                </p>
              </div>
            ))}

            {!summary.isEmpty && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleCopy()}
              >
                <Copy className="h-5 w-5" aria-hidden="true" />
                まとめをコピー
              </Button>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              記録した内容をそのまま数えたものです。診断や治療の判断には使えません。
            </p>
          </>
        )}

        {message && summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
        <LiveRegion message={message} />
      </CardContent>
    </Card>
  );
}
