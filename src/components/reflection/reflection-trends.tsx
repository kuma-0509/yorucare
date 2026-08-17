"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompareMetricTabs } from "@/components/reflection/compare-metric-tabs";
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
  buildComparisonSeries,
  countComparisonPoints,
  countRecordedPoints,
  type ChartMetricId,
  type ComparisonDataPoint,
} from "@/lib/chart-data";
import { COPY } from "@/lib/copy";
import { isMonthlyChartPeriod, type ChartPeriod } from "@/lib/dates";
import { storageErrorMessage } from "@/lib/result";

interface ReflectionTrendsProps {
  refreshKey?: number;
}

export function ReflectionTrends({ refreshKey = 0 }: ReflectionTrendsProps) {
  const [period, setPeriod] = useState<ChartPeriod>("week");
  const [metricId, setMetricId] = useState<ChartMetricId>("mood");
  const [compareMetricId, setCompareMetricId] = useState<ChartMetricId | null>(
    null
  );
  const [points, setPoints] = useState<ComparisonDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const metric = CHART_METRICS.find((m) => m.id === metricId) ?? CHART_METRICS[0];
  const compareMetric =
    compareMetricId === null
      ? null
      : (CHART_METRICS.find((m) => m.id === compareMetricId) ?? null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage(null);
    void buildComparisonSeries(period, metricId, compareMetricId).then(
      (result) => {
        if (!active) return;
        setLoading(false);
        if (!result.ok) {
          setPoints([]);
          setMessage(storageErrorMessage(result.error));
          return;
        }
        setPoints(result.value);
      }
    );
    return () => {
      active = false;
    };
  }, [period, metricId, compareMetricId, refreshKey]);

  const handleMetricChange = (next: ChartMetricId) => {
    setMetricId(next);
    // 主の項目と同じものを重ねると線が二重になるため、重なったら重ね表示を外す
    if (compareMetricId === next) setCompareMetricId(null);
  };

  const recordedCount = countRecordedPoints(points);
  const comparisonCount = countComparisonPoints(points);
  const isMonthly = isMonthlyChartPeriod(period);
  const unitLabel = isMonthly ? "ヶ月分" : "日分";

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
        <MetricTabs value={metricId} onChange={handleMetricChange} />
        <CompareMetricTabs
          primary={metricId}
          value={compareMetricId}
          onChange={setCompareMetricId}
        />
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {message ? (
          <div
            className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-foreground"
            role="alert"
          >
            {message}
          </div>
        ) : loading ? (
          <div
            className="h-[220px] w-full animate-pulse rounded-xl bg-muted sm:h-[240px]"
            aria-hidden
          />
        ) : recordedCount === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-muted px-4 py-8 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              この期間の記録がまだありません。
              <br />
              「書く」タブで記録を続けると、ここに線グラフが表示されます。
            </p>
          </div>
        ) : (
          <>
            <TrendLineChart
              points={points}
              metric={metric}
              period={period}
              compareMetric={compareMetric}
            />
            {compareMetric && (
              <ChartLegend
                primaryLabel={metric.label}
                compareLabel={compareMetric.label}
              />
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {metric.description}
              {recordedCount < points.length &&
                (isMonthly
                  ? ` · 記録がある月だけ線でつながります（${recordedCount}ヶ月分）`
                  : ` · 記録がある日だけ線でつながります（${recordedCount}日分）`)}
            </p>
            {compareMetric && (
              <div className="space-y-1 rounded-xl bg-muted px-3 py-2">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {compareMetric.label}：{compareMetric.description} ·{" "}
                  {COPY.chartCompare.axisNotice}
                  {/* 重ねた側にも母数を添え、少ない記録から傾向を読ませない */}
                  {`（${comparisonCount}${unitLabel}）`}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {COPY.chartCompare.causeNotice}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** 色だけに頼らず、線の形でも2本を見分けられるようにする */
function ChartLegend({
  primaryLabel,
  compareLabel,
}: {
  primaryLabel: string;
  compareLabel: string;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span
          className="h-0.5 w-6 rounded-full bg-[#6b9fd4]"
          aria-hidden
        />
        {primaryLabel}（左の目盛り）
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="h-0 w-6 border-t-2 border-dashed border-[#c2793f]"
          aria-hidden
        />
        {compareLabel}（右の目盛り・破線）
      </li>
    </ul>
  );
}
