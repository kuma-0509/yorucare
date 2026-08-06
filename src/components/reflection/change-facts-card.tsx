"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConsultationLinksDialog } from "@/components/shared/consultation-links-dialog";
import { LiveRegion } from "@/components/shared/live-region";
import { CHANGE_THRESHOLDS } from "@/lib/ai/change-thresholds";
import {
  detectChanges,
  type ChangeDetectionResult,
} from "@/lib/ai/detect-changes";
import { COPY } from "@/lib/copy";
import { formatShortDate, getTodayString, toDateString } from "@/lib/dates";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";

interface ChangeFactsCardProps {
  refreshKey?: number;
}

/** 直近 periodDays 日。記録の入力範囲と揃える */
function currentRange(): { from: string; to: string } {
  const start = new Date();
  start.setDate(start.getDate() - (CHANGE_THRESHOLDS.periodDays - 1));
  return { from: toDateString(start), to: getTodayString() };
}

/**
 * 記録から見えることを、事実として並べる。
 *
 * 「相談先を見る」は、事実の件数にかかわらず常に同じ場所へ同じ強さで置く。
 * 事実が多い日だけ強調すると、アプリが危険度を推定して勧めていることになる。
 */
export function ChangeFactsCard({ refreshKey = 0 }: ChangeFactsCardProps) {
  const [result, setResult] = useState<ChangeDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage(null);

    void repository.getAllRecords().then((records) => {
      if (!active) return;
      setLoading(false);
      if (!records.ok) {
        setResult(null);
        setMessage(storageErrorMessage(records.error));
        return;
      }
      const { from, to } = currentRange();
      setResult(detectChanges(records.value, from, to));
    });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{COPY.changeFacts.title}</CardTitle>
        <CardDescription className="mt-1 text-base leading-relaxed">
          {result
            ? `${formatShortDate(result.range.from)} 〜 ${formatShortDate(
                result.range.to
              )}`
            : COPY.changeFacts.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && !result ? (
          <div
            className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-foreground"
            role="alert"
          >
            {message}
          </div>
        ) : loading || !result ? (
          <div
            className="h-32 w-full animate-pulse rounded-xl bg-muted"
            aria-hidden
          />
        ) : (
          <>
            {result.isEmpty ? (
              <p className="text-base leading-relaxed">
                {COPY.changeFacts.empty}
              </p>
            ) : result.facts.length === 0 ? (
              <p className="text-base leading-relaxed">
                {COPY.changeFacts.noFacts}
              </p>
            ) : (
              <dl className="space-y-3">
                {result.facts.map((fact) => (
                  <div key={fact.id} className="rounded-xl bg-muted/50 px-4 py-3">
                    <dt className="text-xs text-muted-foreground">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium">{fact.value}</dd>
                    <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {fact.note}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              {result.disclaimer}
            </p>
          </>
        )}

        {/* 常設。読み込み中・空状態・事実がある日で、位置も見た目も変えない */}
        <section
          className="space-y-2 border-t border-border pt-4"
          aria-labelledby="change-facts-consultation-heading"
        >
          <h3
            id="change-facts-consultation-heading"
            className="text-sm font-semibold"
          >
            {COPY.changeFacts.consultationHeading}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {COPY.changeFacts.consultationBody}
          </p>
          <ConsultationLinksDialog
            placement="section"
            label={COPY.changeFacts.consultationHeading}
          />
        </section>

        {message && result && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
        <LiveRegion message={message} />
      </CardContent>
    </Card>
  );
}
