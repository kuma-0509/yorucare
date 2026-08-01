"use client";

import { useEffect, useRef, useState } from "react";
import { Library } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookArchiveAnimationProps {
  /** 本の白紙ページに「書かれる」記録の要約行 */
  lines: string[];
  onDone: () => void;
}

/**
 * 「本棚にしまう」演出（簡易版・CSSのみ）。
 * 白紙のページに記録が乗る → 表紙がゆっくり閉じる → 本棚にすっと収まる。
 * prefers-reduced-motion では動きを止めて静かに完了する。
 */
export function BookArchiveAnimation({
  lines,
  onDone,
}: BookArchiveAnimationProps) {
  const [phase, setPhase] = useState<"writing" | "closing">("writing");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const closeAt = reduce ? 30 : 1000;
    const doneAt = reduce ? 120 : 2300;
    const t1 = setTimeout(() => setPhase("closing"), closeAt);
    const t2 = setTimeout(() => onDoneRef.current(), doneAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const closing = phase === "closing";

  return (
    <div className="flex flex-col items-center gap-5 py-6" aria-hidden="true">
      <div className="[perspective:1200px]">
        <div
          className={cn(
            "relative h-44 w-60",
            closing && "yc-anim-book-shelve"
          )}
        >
          {/* 白紙のページ（記録が書かれる面） */}
          <div className="absolute inset-0 overflow-hidden rounded-r-lg rounded-l-sm border border-border bg-white px-4 py-3 shadow-md">
            <div className="space-y-1.5">
              {lines.slice(0, 5).map((line, i) => (
                <p
                  key={i}
                  className="truncate text-xs leading-relaxed text-foreground/80 yc-anim-soft-rise"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* 表紙（左から閉じてくる） */}
          <div
            className={cn(
              "absolute inset-0 rounded-r-lg rounded-l-sm bg-primary [backface-visibility:hidden] [transform:rotateY(-180deg)]",
              closing && "yc-anim-book-close"
            )}
          >
            <div className="flex h-full items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground/90">
                今日の記録
              </span>
            </div>
          </div>

          {/* 背表紙の影 */}
          <div className="absolute inset-y-0 left-0 w-1.5 rounded-l-sm bg-primary/70" />
        </div>
      </div>

      {/* 本棚 */}
      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-muted-foreground">
        <Library className="h-5 w-5" />
        <span className="h-8 w-1 rounded-sm bg-accent" />
        <span className="h-8 w-1 rounded-sm bg-secondary" />
        <span className="h-8 w-1 rounded-sm bg-accent" />
      </div>
    </div>
  );
}
