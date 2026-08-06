"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LiveRegion } from "@/components/shared/live-region";
import { COPY } from "@/lib/copy";
import { getTodayString } from "@/lib/dates";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";
import { suggestMovement, type MovementSuggestion } from "@/lib/selfcare/movement";
import type { MovementOption } from "@/lib/selfcare/movement-config";

interface MovementSuggestionsProps {
  refreshKey?: number;
  /** 「できること」へ追加したときに一覧を読み直させる */
  onDataChange?: () => void;
}

/**
 * 今日の自分メンテ。
 *
 * 「今日は休む」は代替ではなく対等な選択肢なので、
 * 他の候補と同じカードの大きさ・同じ文字サイズで置く。
 * 実施したかどうかは記録しない。達成率や連続日数として数えない。
 */
export function MovementSuggestions({
  refreshKey = 0,
  onDataChange,
}: MovementSuggestionsProps) {
  const [suggestion, setSuggestion] = useState<MovementSuggestion | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void repository.getRecordByDate(getTodayString()).then((record) => {
      if (!active) return;
      if (!record.ok) {
        setMessage(storageErrorMessage(record.error));
        setSuggestion(suggestMovement(null));
        return;
      }
      setSuggestion(suggestMovement(record.value));
    });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const handleAdd = useCallback(
    async (option: MovementOption) => {
      setBusyId(option.id);
      const result = await repository.addSelfCareItem(option.title);
      setBusyId(null);
      if (!result.ok) {
        setMessage(storageErrorMessage(result.error));
        return;
      }
      setMessage(COPY.movement.addedToDictionary);
      onDataChange?.();
    },
    [onDataChange]
  );

  if (!suggestion) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{COPY.movement.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="h-32 w-full animate-pulse rounded-xl bg-muted"
            aria-hidden
          />
        </CardContent>
      </Card>
    );
  }

  const renderOption = (option: MovementOption) => (
    <li
      key={option.id}
      className="rounded-xl border-2 border-border bg-background p-4"
    >
      <p className="text-base font-medium leading-snug">
        「{option.title}」{COPY.movement.choiceSuffix}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{option.duration}</p>
      <p className="mt-2 text-sm leading-relaxed">{option.description}</p>
      {option.level > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={busyId !== null}
          onClick={() => void handleAdd(option)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {COPY.movement.addToDictionary}
        </Button>
      )}
    </li>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{COPY.movement.title}</CardTitle>
        <CardDescription className="mt-1 text-sm leading-relaxed">
          {COPY.movement.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!suggestion.hasRecord && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {COPY.movement.noRecordNote}
          </p>
        )}

        <section aria-labelledby="movement-rest-heading">
          <h3 id="movement-rest-heading" className="text-sm font-semibold">
            {COPY.movement.restHeading}
          </h3>
          <ul className="mt-2 space-y-3">
            {renderOption(suggestion.restOption)}
          </ul>
        </section>

        {suggestion.options.length > 0 && (
          <section aria-labelledby="movement-options-heading">
            <h3 id="movement-options-heading" className="text-sm font-semibold">
              {COPY.movement.optionsHeading}
            </h3>
            <ul className="mt-2 space-y-3">
              {suggestion.options.map(renderOption)}
            </ul>
          </section>
        )}

        {suggestion.basis.length > 0 && (
          <section aria-labelledby="movement-basis-heading">
            <h3 id="movement-basis-heading" className="text-sm font-semibold">
              {COPY.movement.basisHeading}
            </h3>
            <ul className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {suggestion.basis.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {COPY.movement.notCounted}
        </p>

        <section aria-labelledby="movement-caution-heading">
          <h3 id="movement-caution-heading" className="text-sm font-semibold">
            {COPY.movement.cautionHeading}
          </h3>
          <ul className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
            {suggestion.cautions.map((caution) => (
              <li key={caution}>{caution}</li>
            ))}
          </ul>
        </section>

        {message && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        )}
        <LiveRegion message={message} />
      </CardContent>
    </Card>
  );
}
