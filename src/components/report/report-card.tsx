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
import { buildReportSkeleton, buildReportText, type Report } from "@/lib/ai/report";
import {
  fillReport,
  resolveNarrativeFiller,
} from "@/lib/ai/report-narrative";
import { COPY } from "@/lib/copy";
import { formatShortDate, getTodayString, toDateString } from "@/lib/dates";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";

/**
 * 期間の報告書。
 *
 * 数値はアプリが確定させ、文章の穴だけを LLM が埋める穴埋め方式で表示する。
 * `resolveNarrativeFiller()` は現在 null を返すため、ここから外部通信は起きず、
 * すべての穴が定型文で埋まる。外部 AI API への送信は
 * `docs/sharing-decision.md` の Gate に従って別途判断する。
 *
 * 本番のタブからは到達させない。`/preview` 配下は本番ビルドで 404 になる。
 */

/** 対象期間の日数。`docs/sharing-decision.md` 5節に合わせて1週間とする */
export const REPORT_DAYS = 7;

interface ReportCardProps {
  days?: number;
  refreshKey?: number;
}

function currentRange(days: number): { from: string; to: string } {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { from: toDateString(start), to: getTodayString() };
}

export function ReportCard({ days = REPORT_DAYS, refreshKey = 0 }: ReportCardProps) {
  const [report, setReport] = useState<Report | null>(null);
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
        setReport(null);
        setMessage(storageErrorMessage(records.error));
        return;
      }
      const selfCare = await repository.getAllSelfCareItems();
      if (!active) return;
      if (!selfCare.ok) {
        setLoading(false);
        setReport(null);
        setMessage(storageErrorMessage(selfCare.error));
        return;
      }

      const { from, to } = currentRange(days);
      const skeleton = buildReportSkeleton(
        records.value,
        selfCare.value,
        from,
        to
      );
      const filled = await fillReport(skeleton, resolveNarrativeFiller());
      if (!active) return;
      setLoading(false);
      setReport(filled.report);
    };

    void load();
    return () => {
      active = false;
    };
  }, [days, refreshKey]);

  const handleCopy = async () => {
    if (!report) return;
    if (!navigator.clipboard?.writeText) {
      setMessage(COPY.report.copyFailed);
      return;
    }
    try {
      await navigator.clipboard.writeText(buildReportText(report));
      setMessage(COPY.report.copied);
    } catch {
      setMessage(COPY.report.copyFailed);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{COPY.report.title}</CardTitle>
        <CardDescription className="mt-1 text-base leading-relaxed">
          {report
            ? `${formatShortDate(report.range.from)} 〜 ${formatShortDate(report.range.to)}`
            : `直近${days}日間`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && !report ? (
          <div
            className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-foreground"
            role="alert"
          >
            {message}
          </div>
        ) : loading || !report ? (
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted" aria-hidden />
        ) : (
          <>
            <p className="text-base leading-relaxed">{report.headline}</p>

            {report.sections.map((section) => (
              <section key={section.id} className="space-y-2">
                <h3 className="text-xs text-muted-foreground">{section.title}</h3>
                <p className="text-sm leading-relaxed">{section.narrative}</p>
                {section.facts.length > 0 && (
                  <dl className="space-y-2">
                    {section.facts.map((fact) => (
                      <div key={fact.id} className="rounded-xl bg-muted/50 px-4 py-3">
                        <dt className="text-xs text-muted-foreground">
                          {fact.label}
                        </dt>
                        <dd className="mt-0.5 text-sm font-medium">{fact.value}</dd>
                        {fact.note && (
                          <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {fact.note}
                          </dd>
                        )}
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            ))}

            {!report.isEmpty && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleCopy()}
              >
                <Copy className="h-5 w-5" aria-hidden="true" />
                {COPY.report.copyAction}
              </Button>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              {report.notice}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {COPY.report.description}
            </p>
          </>
        )}

        {message && report && (
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        )}
        <LiveRegion message={message} />
      </CardContent>
    </Card>
  );
}
