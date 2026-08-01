"use client";

import { useEffect, useRef, useState } from "react";

export type CinematicPhase =
  | "writing"
  | "pageFlip"
  | "closing"
  | "spine"
  | "shelving"
  | "afterglow"
  | "done";

/** 演出タイムライン（約7.4秒） */
export const TIMELINE = {
  pageFlip: 2300,
  closing: 2900,
  spine: 3800,
  shelving: 4700,
  afterglow: 6200,
  done: 7400,
} as const;

export function useCinematicTimeline(onDone?: () => void) {
  const [phase, setPhase] = useState<CinematicPhase>("writing");
  const [elapsed, setElapsed] = useState(0);
  const onDoneRef = useRef(onDone);
  const doneCalledRef = useRef(false);
  onDoneRef.current = onDone;

  useEffect(() => {
    const finish = () => {
      if (doneCalledRef.current) return;
      doneCalledRef.current = true;
      onDoneRef.current?.();
    };

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      const t = setTimeout(() => {
        setPhase("done");
        finish();
      }, 150);
      return () => clearTimeout(t);
    }

    const start = performance.now();
    const timers = Object.entries(TIMELINE).map(([key, at]) =>
      setTimeout(() => {
        setPhase(key as CinematicPhase);
        if (key === "done") finish();
      }, at)
    );

    const tick = () => {
      setElapsed(performance.now() - start);
    };
    tick();
    const interval = setInterval(tick, 32);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  const phaseProgress = (() => {
    switch (phase) {
      case "writing":
        return Math.min(1, elapsed / TIMELINE.pageFlip);
      case "pageFlip":
        return Math.min(
          1,
          (elapsed - TIMELINE.pageFlip) / (TIMELINE.closing - TIMELINE.pageFlip)
        );
      case "closing":
        return Math.min(
          1,
          (elapsed - TIMELINE.closing) / (TIMELINE.spine - TIMELINE.closing)
        );
      case "spine":
        return Math.min(
          1,
          (elapsed - TIMELINE.spine) / (TIMELINE.shelving - TIMELINE.spine)
        );
      case "shelving":
        return Math.min(
          1,
          (elapsed - TIMELINE.shelving) /
            (TIMELINE.afterglow - TIMELINE.shelving)
        );
      case "afterglow":
        return Math.min(
          1,
          (elapsed - TIMELINE.afterglow) / (TIMELINE.done - TIMELINE.afterglow)
        );
      default:
        return 1;
    }
  })();

  return { phase, elapsed, phaseProgress };
}
