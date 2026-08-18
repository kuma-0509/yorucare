"use client";

import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { COPY } from "@/lib/copy";
import {
  burnActivePapers,
  canBurnWeekly,
  getActivePaperCount,
} from "@/lib/completion-log";

interface WeeklyBurnAnimationProps {
  /** 「紙」としてためた日付の一覧（手放す前の枚数確認用） */
  paperDates: string[];
  onDone: () => void;
}

type Phase = "ready" | "burning" | "fading" | "embers" | "done";

/**
 * 「今週分を手放す（燃やす）」演出（CSS のみ）。
 *
 * デザイン方針：
 * - 怖さ・破壊感・不穏さを出さない。
 * - やわらかい暖色（amber/orange）でろうそくのような炎を表現する。
 * - 紙が光に変わって空へ消えていく、浄化・区切りのニュアンス。
 * - 演出中は常にスキップ可能。
 * - prefers-reduced-motion では動きを止めて静かに完了する。
 */
export function WeeklyBurnAnimation({
  paperDates,
  onDone,
}: WeeklyBurnAnimationProps) {
  const [phase, setPhase] = useState<Phase>("ready");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const count = paperDates.length;

  const startBurn = () => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    burnActivePapers();

    if (reduce) {
      onDoneRef.current();
      return;
    }

    setPhase("burning");
    const t1 = setTimeout(() => setPhase("fading"), 1200);
    const t2 = setTimeout(() => setPhase("embers"), 1900);
    const t3 = setTimeout(() => {
      setPhase("done");
      onDoneRef.current();
    }, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  const paperStack = Math.min(count, 7);

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="text-center">
          <p className="text-base font-medium text-foreground">
            {COPY.completion.burnCountPrefix}
            {count}
            {COPY.completion.burnCountSuffix}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {COPY.completion.burnReadyLead}
            <br />
            {COPY.completion.burnReadyKeep}
          </p>
        </div>

        {/* 紙の束 */}
        <div className="relative flex h-24 w-40 items-end justify-center">
          {Array.from({ length: paperStack }).map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 rounded-sm border border-border bg-white shadow-sm"
              style={{
                width: "7.5rem",
                height: "1rem",
                bottom: `${i * 3}px`,
                transform: `translateX(-50%) rotate(${(i % 2 === 0 ? 1 : -1) * i * 0.8}deg)`,
                opacity: 1 - i * 0.06,
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={startBurn}
          className="flex items-center gap-2 rounded-xl bg-amber-50 px-5 py-3 text-base font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          <Flame className="h-5 w-5 text-amber-500" />
          {COPY.completion.burnReadyAction}
        </button>

        <p className="text-xs text-muted-foreground">
          {COPY.completion.burnReadyNote}
        </p>
      </div>
    );
  }

  if (phase === "burning" || phase === "fading") {
    return (
      <div className="flex flex-col items-center gap-4 py-4" aria-hidden="true">
        {/* 紙の束が燃える */}
        <div className="relative flex h-32 w-40 items-end justify-center">
          {Array.from({ length: paperStack }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "absolute left-1/2 rounded-sm border border-amber-200 bg-amber-50 shadow-sm",
                phase === "fading" && "yc-anim-burn-paper"
              )}
              style={{
                width: "7.5rem",
                height: "1rem",
                bottom: `${i * 3}px`,
                transform: `translateX(-50%) rotate(${(i % 2 === 0 ? 1 : -1) * i * 0.8}deg)`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}

          {/* 炎 */}
          {phase === "burning" && (
            <FlameIcon className="absolute bottom-[2.2rem] left-1/2 -translate-x-1/2" />
          )}
        </div>

        <SkipButton onClick={onDone} />
      </div>
    );
  }

  if (phase === "embers") {
    return (
      <div className="flex flex-col items-center gap-4 py-4" aria-hidden="true">
        <EmbersGroup />
        <SkipButton onClick={onDone} />
      </div>
    );
  }

  return null;
}

/** ろうそくのような小さな炎（暖色・赤みを抑える） */
function FlameIcon({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* 外炎（やや広め） */}
      <div
        className="h-10 w-6 rounded-t-full bg-gradient-to-t from-amber-400 to-amber-200 opacity-70 yc-anim-flame-sway"
        style={{ animationDelay: "80ms" }}
      />
      {/* 内炎（明るく細い） */}
      <div className="absolute top-0 h-7 w-3 rounded-t-full bg-gradient-to-t from-amber-300 to-amber-100 opacity-90 yc-anim-flame-sway" />
    </div>
  );
}

/** 燃え尽きた後の光の粒 */
function EmbersGroup() {
  const embers = [
    { delay: 0, left: "46%" },
    { delay: 120, left: "54%" },
    { delay: 60, left: "50%" },
    { delay: 200, left: "42%" },
    { delay: 180, left: "58%" },
  ];
  return (
    <div className="relative h-20 w-40">
      {embers.map(({ delay, left }, i) => (
        <div
          key={i}
          className="absolute bottom-4 h-2 w-2 rounded-full bg-amber-300 yc-anim-ember-rise"
          style={{
            left,
            opacity: 0,
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {COPY.completion.skipDuringEffect}
    </button>
  );
}

/**
 * 演出なしで枚数を確認し、しきい値に届いていれば燃やす導線を1行だけ
 * 表示するミニバナー。CompletionChoice の "done" フェーズに差し込む。
 * しきい値の判定は completion-log 側（WEEKLY_BURN_THRESHOLD）に任せる。
 */
export function WeeklyBurnBanner({
  onBurnStart,
}: {
  onBurnStart: () => void;
}) {
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!canBurnWeekly()) return;
    setCount(getActivePaperCount());
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="yc-anim-soft-rise flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-amber-900">
          {COPY.completion.burnCountPrefix}
          {count}
          {COPY.completion.burnCountSuffix}
        </p>
        <p className="mt-0.5 text-xs text-amber-700">
          {COPY.completion.burnBannerHint}
        </p>
      </div>
      <button
        type="button"
        onClick={onBurnStart}
        className="ml-3 shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1"
      >
        <Flame className="h-4 w-4 text-amber-500" />
        {COPY.completion.burnBannerAction}
      </button>
    </div>
  );
}
