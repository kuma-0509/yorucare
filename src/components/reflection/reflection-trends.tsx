"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricTabs } from "@/components/reflection/metric-tabs";
import { PeriodTabs } from "@/components/reflection/period-tabs";

// recharts は重いため、ふりかえりタブで実際にグラフを描くときだけ読み込む
// （既定の「書く」タブの初期バンドルから除外する）
const TrendLineChart = dynamic(
  () =>
    import("@/components/reflection/trend-line-chart").then(
      (m) => m.TrendLineChart
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[220px] w-full animate-pulse rounded-xl bg-muted sm:h-[240px]"
        aria-hidden
      />
    ),
  }
);
import {
  CHART_METRICS,
  buildTrendSeries,
  countRecordedPoints,
  type ChartMetricId,
} from "@/lib/chart-data";
import { isMonthlyChartPeriod, type ChartPeriod } from "@/lib/dates";

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
  const isMonthly = isMonthlyChartPeriod(period);

  return (
    <Card>
      <CardHeader className="space-y-4 pb-2">
        <div>
          <CardTitle>体調の傾向</CardTitle>
          <CardDescription className="mt-1 text-base leading-relaxed">
            期間と項目を選ぶと、その変化を線グラフで見られます。
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
                (isMonthly
                  ? ` · 記録がある月だけ線でつながります（${recordedCount}ヶ月分）`
                  : ` · 記録がある日だけ線でつながります（${recordedCount}日分）`)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
