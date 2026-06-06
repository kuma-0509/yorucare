"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricTabs } from "@/components/reflection/metric-tabs";
import { PeriodTabs } from "@/components/reflection/period-tabs";
import { TrendLineChart } from "@/components/reflection/trend-line-chart";
import {
  CHART_METRICS,
  buildTrendSeries,
  countRecordedPoints,
  type ChartMetricId,
} from "@/lib/chart-data";
import type { ChartPeriod } from "@/lib/dates";

interface ReflectionTrendsProps {
  refreshKey?: number;
}

export function ReflectionTrends({ refreshKey = 0 }: ReflectionTrendsProps) {
  const [period, setPeriod] = useState<ChartPeriod>("week");
  const [metricId, setMetricId] = useState<ChartMetricId>("mood");

  const metric = CHART_METRICS.find((m) => m.id === metricId) ?? CHART_METRICS[0];

  void refreshKey;
  const points = buildTrendSeries(period, metricId);

  const recordedCount = countRecordedPoints(points);

  return (
    <Card>
      <CardHeader className="space-y-4 pb-2">
        <div>
          <CardTitle>体調の傾向</CardTitle>
          <CardDescription className="mt-1 text-base leading-relaxed">
            記録を重ねると、自分の波のパターンが見えてきます。
          </CardDescription>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} />
        <MetricTabs value={metricId} onChange={setMetricId} />
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {recordedCount === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-muted px-4 py-8 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              この期間の記録がまだありません。
              <br />
              「書く」タブで記録を続けると、ここに線グラフが表示されます。
            </p>
          </div>
        ) : (
          <>
            <TrendLineChart points={points} metric={metric} period={period} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {metric.description}
              {recordedCount < points.length &&
                ` · 記録がある日だけ線でつながります（${recordedCount}日分）`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
