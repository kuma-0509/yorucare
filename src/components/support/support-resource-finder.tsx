"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SelectionControl,
  SelectionGroup,
} from "@/components/shared/selection-control";
import { DataSourceNotice } from "@/components/support/data-source-notice";
import {
  availabilityLabel,
  CONSULTATION_METHOD_LABEL,
  CONSULTATION_METHODS,
  nextOpeningLabel,
  SELECTABLE_CATEGORIES,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_URGENCIES,
  SUPPORT_URGENCY_LABEL,
} from "@/components/support/support-labels";
import { COPY } from "@/lib/copy";
import { createDemoTokyoAdapter } from "@/lib/support/adapter";
import {
  listMunicipalities,
  searchSupportResources,
  type SupportSearchItem,
} from "@/lib/support/search";
import type {
  ConsultationMethod,
  SupportCategory,
  SupportResource,
  SupportUrgency,
} from "@/lib/support/types";

/**
 * 東京都内の支援先をさがす。
 *
 * 条件はすべて本人が選ぶ。記録は読まない。
 * 「いつ相談したいか」は並び順を変えるだけで、絞り込みには使わない。
 * 絞ると受付時間外に候補が0件になり、選べる先がない画面になるため。
 */
export function SupportResourceFinder() {
  const adapter = useMemo(() => createDemoTokyoAdapter(), []);
  const [resources, setResources] = useState<SupportResource[]>([]);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [municipality, setMunicipality] = useState<string | undefined>();
  const [category, setCategory] = useState<SupportCategory | undefined>();
  const [method, setMethod] = useState<ConsultationMethod | undefined>();
  const [urgency, setUrgency] = useState<SupportUrgency | undefined>();
  // 現在時刻はブラウザで決める。描画時に読むとサーバ側と食い違う
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    setNow(new Date());
    void adapter.loadResources().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setLoadMessage(result.error.message);
        return;
      }
      setResources(result.value);
    });
    return () => {
      active = false;
    };
  }, [adapter]);

  const municipalities = useMemo(
    () => listMunicipalities(resources),
    [resources]
  );

  const items: SupportSearchItem[] = useMemo(() => {
    if (now === null) return [];
    return searchSupportResources(
      resources,
      { municipality, category, method, urgency },
      now
    );
  }, [resources, municipality, category, method, urgency, now]);

  const isDemo = adapter.dataSource.kind === "demo";

  return (
    <section
      className="space-y-4 rounded-2xl border bg-card p-4"
      aria-labelledby="support-finder-heading"
    >
      <div>
        <h2 id="support-finder-heading" className="font-semibold">
          {COPY.support.finderTitle}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {COPY.support.finderDescription}
        </p>
      </div>

      {isDemo && (
        <p className="rounded-xl border border-caution-border bg-caution/40 px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold">{COPY.support.demoBadge}</span>{" "}
          {COPY.support.demoNotice}
        </p>
      )}

      {loadMessage && (
        <p className="text-sm leading-relaxed" role="alert">
          {loadMessage}
        </p>
      )}

      {municipalities.length > 0 && (
        <SelectionGroup
          legend={COPY.support.municipalityLegend}
          mode="radio"
          className="space-y-2"
        >
          <div className="flex flex-wrap gap-2">
            <SelectionControl
              layout="chip"
              mode="radio"
              selected={municipality === undefined}
              onClick={() => setMunicipality(undefined)}
            >
              {COPY.support.anyMunicipality}
            </SelectionControl>
            {municipalities.map((name) => (
              <SelectionControl
                key={name}
                layout="chip"
                mode="radio"
                selected={municipality === name}
                onClick={() => setMunicipality(name)}
              >
                {name}
              </SelectionControl>
            ))}
          </div>
        </SelectionGroup>
      )}

      <SelectionGroup legend={COPY.support.categoryLegend} mode="radio">
        <div className="flex flex-wrap gap-2">
          <SelectionControl
            layout="chip"
            mode="radio"
            selected={category === undefined}
            onClick={() => setCategory(undefined)}
          >
            {COPY.support.anyCategory}
          </SelectionControl>
          {SELECTABLE_CATEGORIES.map((value) => (
            <SelectionControl
              key={value}
              layout="chip"
              mode="radio"
              selected={category === value}
              onClick={() => setCategory(value)}
            >
              {SUPPORT_CATEGORY_LABEL[value]}
            </SelectionControl>
          ))}
        </div>
      </SelectionGroup>

      <SelectionGroup legend={COPY.support.methodLegend} mode="radio">
        <div className="flex flex-wrap gap-2">
          <SelectionControl
            layout="chip"
            mode="radio"
            selected={method === undefined}
            onClick={() => setMethod(undefined)}
          >
            {COPY.support.anyMethod}
          </SelectionControl>
          {CONSULTATION_METHODS.map((value) => (
            <SelectionControl
              key={value}
              layout="chip"
              mode="radio"
              selected={method === value}
              onClick={() => setMethod(value)}
            >
              {CONSULTATION_METHOD_LABEL[value]}
            </SelectionControl>
          ))}
        </div>
      </SelectionGroup>

      <SelectionGroup legend={COPY.support.urgencyLegend} mode="radio">
        <div className="flex flex-wrap gap-2">
          {SUPPORT_URGENCIES.map((value) => (
            <SelectionControl
              key={value}
              layout="chip"
              mode="radio"
              selected={urgency === value}
              onClick={() =>
                setUrgency((current) => (current === value ? undefined : value))
              }
            >
              {SUPPORT_URGENCY_LABEL[value]}
            </SelectionControl>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {COPY.support.urgencyNote}
        </p>
      </SelectionGroup>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">{COPY.support.resultsHeading}</h3>
        {items.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {COPY.support.noResults}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map(({ resource, availability }) => (
              <li
                key={resource.id}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h4 className="text-sm font-semibold">{resource.name}</h4>
                  {resource.source.kind === "demo" && (
                    <span className="rounded-full border border-caution-border bg-caution/40 px-2 py-0.5 text-[11px]">
                      {COPY.support.demoBadge}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {SUPPORT_CATEGORY_LABEL[resource.category]} ·{" "}
                  {resource.municipality ?? COPY.support.prefectureWideLabel}
                </p>

                <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed">
                  <Clock
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>
                    {availabilityLabel(availability)}
                    {availability.closingTime &&
                      `（${availability.closingTime}${COPY.support.openUntilSuffix}）`}
                    {nextOpeningLabel(availability) && (
                      <>
                        <br />
                        {nextOpeningLabel(availability)}
                      </>
                    )}
                  </span>
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {resource.consultationMethod
                    .map((value) => CONSULTATION_METHOD_LABEL[value])
                    .join("・")}
                  {" · "}
                  {resource.reservationRequired
                    ? COPY.support.reservationRequired
                    : COPY.support.reservationNotRequired}
                </p>

                {resource.targetUsers && resource.targetUsers.length > 0 && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {COPY.support.targetUsersLabel}:{" "}
                    {resource.targetUsers.join("・")}
                  </p>
                )}

                <p className="mt-2 text-xs leading-relaxed">
                  {resource.description}
                </p>

                {(resource.phone || resource.websiteUrl) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {resource.phone && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={`tel:${resource.phone.replace(/[^0-9+]/g, "")}`}
                          aria-label={`${resource.name} ${resource.phone}に電話`}
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          {resource.phone}
                        </a>
                      </Button>
                    )}
                    {resource.websiteUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={resource.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {COPY.support.officialPage}
                          <ExternalLink
                            className="h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DataSourceNotice dataSource={adapter.dataSource} />
    </section>
  );
}
