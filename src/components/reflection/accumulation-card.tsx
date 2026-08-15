"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiveRegion } from "@/components/shared/live-region";
import {
  buildAccumulationBoard,
  type AccumulationBoard,
} from "@/lib/ai/milestones";
import { COPY } from "@/lib/copy";
import { getTodayString } from "@/lib/dates";
import { repository } from "@/lib/repository";
import { storageErrorMessage } from "@/lib/result";

interface AccumulationCardProps {
  refreshKey?: number;
}

/**
 * 起点からの積み重ねを表示する。
 *
 * 数え方と言い方は `src/lib/ai/milestones.ts` が決め、ここは並べるだけにする。
 * 連続日数を強調しない並び順もライブラリ側の責任なので、ここで並べ替えない。
 */
export function AccumulationCard({ refreshKey = 0 }: AccumulationCardProps) {
  const [board, setBoard] = useState<AccumulationBoard | null>(null);
  const [returnDate, setReturnDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  /** isActive は、画面から外れたあとの結果で状態を書き換えないための確認 */
  const load = useCallback(async (isActive: () => boolean = () => true) => {
    const records = await repository.getAllRecords();
    if (!isActive()) return;
    if (!records.ok) {
      setLoading(false);
      setBoard(null);
      setMessage(storageErrorMessage(records.error));
      return;
    }
    const stored = await repository.getReturnDate();
    if (!isActive()) return;
    if (!stored.ok) {
      setLoading(false);
      setBoard(null);
      setMessage(storageErrorMessage(stored.error));
      return;
    }
    setLoading(false);
    setReturnDate(stored.value);
    setBoard(
      buildAccumulationBoard(records.value, stored.value, getTodayString())
    );
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage(null);
    void load(() => active);
    return () => {
      active = false;
    };
  }, [refreshKey, load]);

  const handleSaveStart = async () => {
    const result = await repository.saveReturnDate(draft);
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setEditing(false);
    setMessage(COPY.accumulation.startSaved);
    await load();
  };

  const handleClearStart = async () => {
    const result = await repository.saveReturnDate(null);
    if (!result.ok) {
      setMessage(storageErrorMessage(result.error));
      return;
    }
    setEditing(false);
    setDraft("");
    setMessage(COPY.accumulation.startCleared);
    await load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{COPY.accumulation.title}</CardTitle>
        <CardDescription className="mt-1 text-base leading-relaxed">
          {COPY.accumulation.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && !board ? (
          <div
            className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-foreground"
            role="alert"
          >
            {message}
          </div>
        ) : loading || !board ? (
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted" aria-hidden />
        ) : (
          <>
            <p className="text-base leading-relaxed">{board.headline}</p>

            {board.messages.length > 0 && (
              <div className="space-y-1 rounded-xl bg-primary/5 px-4 py-3">
                {board.messages.map((text) => (
                  <p key={text} className="text-sm leading-relaxed">
                    {text}
                  </p>
                ))}
              </div>
            )}

            {board.lines.length > 0 && (
              <dl className="space-y-3">
                {board.lines.map((line) => (
                  <div key={line.id} className="rounded-xl bg-muted/50 px-4 py-3">
                    <dt className="text-xs text-muted-foreground">{line.label}</dt>
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

            {board.badges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs text-muted-foreground">
                  {COPY.accumulation.milestoneHeading}
                </h3>
                <ul className="space-y-1">
                  {board.badges.map((badge) => (
                    <li
                      key={badge.id}
                      className="flex flex-wrap items-baseline gap-x-2 text-sm leading-relaxed"
                    >
                      <span className="text-muted-foreground">{badge.label}</span>
                      <span className="font-medium">
                        {badge.reachedLabel ?? COPY.accumulation.notReached}
                      </span>
                      {badge.nextLabel && (
                        <span className="text-xs text-muted-foreground">
                          {COPY.accumulation.nextPrefix} {badge.nextLabel}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">{COPY.accumulation.startHeading}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {COPY.accumulation.startDescription}
          </p>

          {editing ? (
            <div className="space-y-2">
              <Label htmlFor="accumulation-start-date" className="text-xs">
                {COPY.accumulation.startHeading}
              </Label>
              <Input
                id="accumulation-start-date"
                type="date"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSaveStart()}
                  disabled={draft === ""}
                >
                  {COPY.save}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  {COPY.cancel}
                </Button>
                {returnDate !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleClearStart()}
                  >
                    {COPY.accumulation.startClearAction}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setDraft(returnDate ?? getTodayString());
                setEditing(true);
              }}
            >
              {returnDate === null
                ? COPY.accumulation.startEditAction
                : COPY.accumulation.startChangeAction}
            </Button>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            {COPY.accumulation.startNotice}
          </p>
        </div>

        {message && board && (
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        )}
        <LiveRegion message={message} />
      </CardContent>
    </Card>
  );
}
