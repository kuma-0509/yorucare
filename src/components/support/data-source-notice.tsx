"use client";

import { COPY } from "@/lib/copy";
import { PLANNED_TOKYO_DATASETS } from "@/lib/support/adapter";
import type { DataPermissionBasis, DataSource } from "@/lib/support/types";

interface DataSourceNoticeProps {
  dataSource: DataSource;
}

/** 利用の根拠を、当事者向けの言い方で示す */
const PERMISSION_LABEL: Record<DataPermissionBasis, string> = {
  openDataCatalog: COPY.support.dataPermissionOpenDataCatalog,
  permissionGranted: COPY.support.dataPermissionGranted,
  permissionRequired: COPY.support.dataPermissionRequired,
  unverified: COPY.support.dataPermissionUnverified,
  demoOnly: COPY.support.dataPermissionDemoOnly,
};

/**
 * 「データについて」。
 *
 * 出典、更新日、デモか実データかを必ず開示する。
 * 更新日が確認できないときは「最新である」と読めない書き方にし、
 * 利用前に公式サイトか電話で確かめるよう案内する。
 */
export function DataSourceNotice({ dataSource }: DataSourceNoticeProps) {
  return (
    <section
      className="rounded-2xl border border-border bg-muted/40 p-4"
      aria-labelledby="support-data-about-heading"
    >
      <h3 id="support-data-about-heading" className="text-sm font-semibold">
        {COPY.support.dataAboutHeading}
      </h3>
      <dl className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
        <div className="flex gap-2">
          <dt className="shrink-0">{COPY.support.dataProviderLabel}</dt>
          <dd>{dataSource.provider}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0">{COPY.support.dataDatasetLabel}</dt>
          <dd>{dataSource.datasetName}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0">{COPY.support.dataUpdatedLabel}</dt>
          <dd>{dataSource.updatedAt ?? COPY.support.dataUpdatedUnknown}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0">{COPY.support.dataKindLabel}</dt>
          <dd>
            {dataSource.kind === "demo"
              ? COPY.support.demoBadge
              : COPY.support.dataKindOfficial}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0">{COPY.support.dataPermissionLabel}</dt>
          <dd>{PERMISSION_LABEL[dataSource.permissionBasis]}</dd>
        </div>
        {dataSource.license && (
          <div className="flex gap-2">
            <dt className="shrink-0">{COPY.support.dataLicenseLabel}</dt>
            <dd>{dataSource.license}</dd>
          </div>
        )}
        {dataSource.referenceUrl && (
          <div className="flex gap-2">
            <dt className="shrink-0">{COPY.support.dataReferenceLabel}</dt>
            <dd className="break-all">
              <a
                className="underline"
                href={dataSource.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {dataSource.referenceUrl}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {COPY.support.dataVerifyBody}
      </p>

      <h4 className="mt-3 text-xs font-semibold">
        {COPY.support.plannedHeading}
      </h4>
      <ul className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
        {PLANNED_TOKYO_DATASETS.map((dataset) => (
          <li key={`${dataset.provider}-${dataset.datasetName}`}>
            {dataset.provider}「{dataset.datasetName}」— {dataset.usedFor}（
            {PERMISSION_LABEL[dataset.permissionBasis]}）
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {COPY.support.plannedNote}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {COPY.support.plannedMunicipalNote}
      </p>
    </section>
  );
}
