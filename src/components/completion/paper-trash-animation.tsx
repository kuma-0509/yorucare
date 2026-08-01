"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaperTrashAnimationProps {
  /** 紙に書かれている記録の要約行 */
  lines: string[];
  onDone: () => void;
}

/**
 * 「紙にして手放す」演出（簡易版・CSSのみ）。
 * 紙に書く → やわらかく丸まる → ゴミ箱にふわっと入る。
 * 破壊感・不穏さを出さないよう、動きはゆっくり・やさしくする。
 * prefers-reduced-motion では動きを止めて静かに完了する。
 */
export function PaperTrashAnimation({
  lines,
  onDone,
}: PaperTrashAnimationProps) {
  const [phase, setPhase] = useState<"writing" | "crumple" | "drop">(
    "writing"
  );
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const crumpleAt = reduce ? 30 : 900;
    const dropAt = reduce ? 60 : 1500;
    const doneAt = reduce ? 140 : 2400;
    const t1 = setTimeout(() => setPhase("crumple"), crumpleAt);
    const t2 = setTimeout(() => setPhase("drop"), dropAt);
    const t3 = setTimeout(() => onDoneRef.current(), doneAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center gap-4 py-6"
      aria-hidden="true"
    >
      <div className="flex h-32 items-start justify-center">
        <div
          className={cn(
            "w-52 overflow-hidden rounded-lg border border-border bg-white px-4 py-3 shadow-sm",
            phase === "crumple" && "yc-anim-paper-crumple",
            phase === "drop" && "yc-anim-paper-drop"
          )}
        >
          <div className="space-y-1.5">
            {lines.slice(0, 4).map((line, i) => (
              <p
                key={i}
                className="truncate text-xs leading-relaxed text-foreground/70"
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ゴミ箱 */}
      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-muted-foreground">
        <Trash2 className="h-6 w-6" />
      </div>
    </div>
  );
}
